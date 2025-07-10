import express from 'express'
import WeatherRouter from './router/weather'

const app = express()

app.use('/', WeatherRouter)

app.listen(8000)
