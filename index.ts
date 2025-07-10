import express from 'express'
import WeatherRouter from './router/weather'

const app = express()

app.use('/', WeatherRouter)

const port = 8000

app.listen(port, () => {
  console.log(`Listening on Port ${port}`)
})
