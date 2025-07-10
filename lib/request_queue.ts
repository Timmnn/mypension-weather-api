class RequestQueue {
  private queue: (() => Promise<any>)[] = []
  private runningRequests = 0
  private readonly maxConcurrentRequests: number

  constructor(maxConcurrentRequests: number) {
    this.maxConcurrentRequests = maxConcurrentRequests
  }

  // Add a function to the queue
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const result = await task()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.runningRequests--
          this.dequeue()
        }
      }
      this.queue.push(wrappedTask)
      this.dequeue()
    })
  }

  // Process items in the queue
  private dequeue() {
    while (
      this.runningRequests < this.maxConcurrentRequests &&
      this.queue.length > 0
    ) {
      const task = this.queue.shift()
      if (task) {
        this.runningRequests++
        task()
      }
    }
  }
}

export const request_queue = new RequestQueue(5)
