import express from 'express'
import { WeatherController } from '../controller/weather'

const router = express.Router()

router.get('/weather', WeatherController.getWeather)

export default router
