import type { Request, Response } from 'express'
import { WeatherService } from '../services/weather'
import dotenv from 'dotenv'
dotenv.config()

export const WeatherController = {
  getWeather: async (req: Request, res: Response) => {
    const city = req.query.city as string
    if (!city)
      return res.status(400).json({
        error: 'Missing city parameter',
      })

    try {
      const weather = await WeatherService.getWeather(city)
      res.json(weather)
    } catch (e) {
      res.status(503).json({ error: 'Service Unavailable' })
    }
  },
}
