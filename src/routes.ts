import { Router } from 'express'
import { HomeController } from './controllers/home'
import { AuthController } from './controllers/auth'
import { AuthMiddleware } from './middleware/AuthMiddleware'

const router = Router()

router.get('/auth', AuthController.get)
router.get('/', AuthMiddleware, HomeController.get)

export default router
