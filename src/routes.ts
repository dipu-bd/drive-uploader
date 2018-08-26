import { Router } from 'express'
import { HomeController } from './controllers/home'
import { AuthController } from './controllers/auth'
import AuthMiddleware, { CheckToken } from './middleware/AuthMiddleware'

const router = Router()

router.use(AuthMiddleware)

router.get('/auth', AuthController.get)
router.get('/auth/refresh', CheckToken, AuthController.refreshToken)

router.get('/', CheckToken, HomeController.get)

export default router
