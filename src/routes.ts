import { Router } from 'express'
import { HomeController } from './controllers/home'

const router = Router()

// api routes

// web routes
router.get('/', HomeController.get)

export default router
