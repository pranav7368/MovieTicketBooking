const express = require('express')
const {
	createOrder,
	processPayment,
	getPaymentDetails,
	getUserPayments
} = require('../controllers/paymentController')

const router = express.Router()

const { protect } = require('../middleware/auth')

router.post('/create-order', protect, createOrder)
router.post('/process', protect, processPayment)
router.get('/user', protect, getUserPayments)
router.get('/:paymentId', protect, getPaymentDetails)

module.exports = router