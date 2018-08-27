import { Router } from 'express'
import { HomeController } from './controllers/home'
import { AuthController } from './controllers/auth'
import AuthMiddleware, { CheckToken, ApiShield } from './middleware/AuthMiddleware'
import { ApiController } from './controllers/api'

const router = Router()

router.use(AuthMiddleware)

router.get('/api/list', ApiShield, ApiController.listIds)
router.get('/api/downloads/:id', ApiShield, ApiController.getDownload)
router.get('/api/downloads', ApiController.getDownload)
router.get('/api/download/stop', ApiController.stopDownload)

router.get('/auth', AuthController.get)
router.get('/auth/logout', AuthController.logout)

router.get('/', CheckToken, HomeController.get)
router.get('/:id', HomeController.getId)
router.post('/:id', HomeController.postId)


export default router
