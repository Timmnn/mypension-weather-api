import { request_queue } from '../lib/request_queue'
import { weatherCache } from '../lib/cache'

export const WeatherService = {
  getWeather: async (city: string) => {
    const coordinates = await getCityCoords(city)
    const weather = await getWeatherForCoords(coordinates, city)
    return weather
  },
}

type Coordinates = { lat: number; lng: number }

type WeatherSource = {
  name: string
  url: (coords: Coordinates) => string
  formatter: (data: any) => WeatherResponse
  apiKey?: string
}

type WeatherResponse = {
  temperatureC: number
  // conditions arent provided by the apis, so i left that out
  wind: number
}

const weatherSources: WeatherSource[] = [
  //Primary Data Source
  {
    name: 'OpenMeteo',
    url: (coords) =>
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`,
    formatter: (data) => ({
      temperatureC: data.current.temperature_2m,
      wind: data.current.wind_speed_10m,
    }),
  },
  // Fallback Source
  {
    name: 'OpenWeatherMap',
    url: (coords) =>
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}&units=metric&appid=${process.env.OPENWEATHERMAP_API_KEY}`,
    formatter: (data) => ({
      temperatureC: data.main.temp,
      wind: data.wind.speed,
    }),
    apiKey: process.env.OPENWEATHERMAP_API_KEY,
  },
  /*{
    name: 'Weatherbit',
    url: (coords, date) =>
      `https://api.weatherbit.io/v2.0/current?lat=${coords.lat}&lon=${coords.lng}&key=${process.env.WEATHERBIT_API_KEY}`,
    formatter: (data) => ({
    ...
    }),
    apiKey: process.env.WEATHERBIT_API_KEY,
  },*/
]

const getWeatherForCoords = async (coords: Coordinates, city: string) => {
  type ApiResponse = { source: string; weather: WeatherResponse }
  const results: Promise<ApiResponse>[] = []

  for (let source of weatherSources) {
    const task = async () => {
      const cacheKey = `${source.name}-${coords.lng}-${coords.lng}`
      const cacheValue = weatherCache.get(cacheKey)
      if (cacheValue) return cacheValue as ApiResponse

      const response = await fetch(source.url(coords))
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`)

      const return_value = {
        source: source.name,
        weather: source.formatter((await response.json()) as WeatherResponse),
      }

      weatherCache.put(cacheKey, return_value, 60 * 60 * 1000)

      return return_value
    }

    results.push(request_queue.enqueue(task))
  }

  const awaited = (await Promise.allSettled(results))
    .filter(
      (settlement): settlement is PromiseFulfilledResult<ApiResponse> =>
        settlement.status === 'fulfilled'
    )
    .map((settlement) => settlement.value)

  if (!awaited.length) throw 'No sources available'

  const tempAvg =
    awaited.map((s) => s.weather.temperatureC).reduce((a, b) => a + b, 0) /
    awaited.length

  const windAvg =
    awaited.map((s) => s.weather.wind).reduce((a, b) => a + b, 0) /
    awaited.length

  return {
    city,
    sources: awaited.map((s) => s.source),
    datetime: new Date().toISOString(),
    temperatureC: tempAvg,
    windKph: windAvg,
  }
}

const getCityCoords = async (city: string): Promise<Coordinates> => {
  const cacheKey = `geocode-${city}`
  const cacheValue = weatherCache.get(cacheKey)

  if (cacheValue) return cacheValue as Coordinates

  const geocodingApiUrl = `https://maps-data.p.rapidapi.com/geocoding.php?query=${city}&lang=en&country=de`
  const apiKey = process.env.RAPIDAPI_KEY

  try {
    const response = await fetch(geocodingApiUrl, {
      //@ts-ignore
      headers: {
        'x-rapidapi-key': apiKey,
      },
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = (await response.json()) as {
      data: { lat: number; lng: number }
    }

    const return_value = {
      lat: data.data.lat,
      lng: data.data.lng,
    }
    weatherCache.put(cacheKey, return_value, 60 * 60 * 1000)

    return return_value
  } catch (error) {
    console.error('Error fetching city coordinates:', error)
    throw error
  }
}
