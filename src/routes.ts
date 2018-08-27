import { Router } from 'express'
import { HomeController } from './controllers/home'
import { AuthController } from './controllers/auth'
import AuthMiddleware, { CheckToken } from './middleware/AuthMiddleware'

const router = Router()

router.use(AuthMiddleware)

router.get('/auth', AuthController.get)
router.get('/auth/logout', AuthController.logout)

router.get('/', CheckToken, HomeController.get)
router.get('/:id', HomeController.getId)
router.post('/:id', HomeController.postId)

export default router
