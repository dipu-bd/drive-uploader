import { Router } from 'express'
import { HomeController } from './controllers/home'
import { AuthController } from './controllers/auth'

const router = Router()

// api routes

// web routes
router.get('/', HomeController.get)
router.get('/auth', AuthController.get)

export default router
