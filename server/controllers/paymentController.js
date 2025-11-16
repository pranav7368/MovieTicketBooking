const Payment = require('../models/Payment')
const Showtime = require('../models/Showtime')
const User = require('../models/User')

// Generate mock transaction ID
const generateTransactionId = () => {
	const timestamp = Date.now()
	const random = Math.floor(Math.random() * 1000000)
	return `TXN${timestamp}${random}`
}

// Generate mock order ID
const generateOrderId = () => {
	const timestamp = Date.now()
	const random = Math.floor(Math.random() * 1000000)
	return `ORD${timestamp}${random}`
}

//@desc     Create payment order
//@route    POST /payment/create-order
//@access   Private
exports.createOrder = async (req, res, next) => {
	try {
		const { showtimeId, seats, amount } = req.body
		const user = req.user

		// Validate showtime exists
		const showtime = await Showtime.findById(showtimeId).populate({
			path: 'theater',
			select: 'seatPlan'
		})

		if (!showtime) {
			return res.status(400).json({
				success: false,
				message: `Showtime not found with id of ${showtimeId}`
			})
		}

		// Validate seats
		const isSeatValid = seats.every((seatNumber) => {
			const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1)
			const maxRow = showtime.theater.seatPlan.row
			const maxCol = showtime.theater.seatPlan.column

			if (maxRow.length !== row.length) {
				return maxRow.length > row.length
			}

			return maxRow.localeCompare(row) >= 0 && number <= maxCol
		})

		if (!isSeatValid) {
			return res.status(400).json({ success: false, message: 'Seat is not valid' })
		}

		// Check if seats are available
		const isSeatAvailable = seats.every((seatNumber) => {
			const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1)
			return !showtime.seats.some((seat) => seat.row === row && seat.number === parseInt(number, 10))
		})

		if (!isSeatAvailable) {
			return res.status(400).json({ success: false, message: 'Seat not available' })
		}

		// Create order ID
		const orderId = generateOrderId()

		// Create payment record in database
		const payment = await Payment.create({
			user: user._id,
			showtime: showtimeId,
			seats: seats.map((seatNumber) => {
				const [row, number] = seatNumber.match(/([A-Za-z]+)(\d+)/).slice(1)
				return { row, number: parseInt(number, 10) }
			}),
			amount: amount,
			orderId: orderId,
			status: 'pending'
		})

		res.status(200).json({
			success: true,
			order: {
				id: orderId,
				amount: amount,
				currency: 'INR',
				paymentId: payment._id
			}
		})
	} catch (err) {
		console.error(err)
		res.status(400).json({ success: false, message: err.message || err })
	}
}

//@desc     Process mock payment
//@route    POST /payment/process
//@access   Private
exports.processPayment = async (req, res, next) => {
	try {
		const { paymentId, cardNumber, cardholderName, expiryMonth, expiryYear, cvv } = req.body
		const user = req.user

		// Find payment record
		const payment = await Payment.findById(paymentId)

		if (!payment) {
			return res.status(400).json({
				success: false,
				message: 'Payment record not found'
			})
		}

		// Simulate payment processing delay
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Mock payment validation rules
		const lastDigit = parseInt(cardNumber.slice(-1))

		// Cards ending in 0, 2, 4, 6, 8 = Success
		// Cards ending in 1, 3, 5, 7, 9 = Failed
		// Card 4111111111111111 = Always Success (test card)
		const isSuccess =
			cardNumber === '4111111111111111' ||
			cardNumber === '5555555555554444' ||
			cardNumber === '378282246310005' ||
			lastDigit % 2 === 0

		if (!isSuccess) {
			// Payment failed
			payment.status = 'failed'
			payment.transactionId = generateTransactionId()
			payment.paymentMethod = 'card'
			payment.cardLast4 = cardNumber.slice(-4)
			await payment.save()

			return res.status(400).json({
				success: false,
				message: 'Payment declined. Please try a different card.'
			})
		}

		// Payment successful
		const transactionId = generateTransactionId()

		payment.transactionId = transactionId
		payment.paymentMethod = 'card'
		payment.cardLast4 = cardNumber.slice(-4)
		payment.cardholderName = cardholderName
		payment.status = 'success'
		await payment.save()

		// Update showtime with booked seats
		const showtime = await Showtime.findById(payment.showtime)

		if (!showtime) {
			return res.status(400).json({
				success: false,
				message: 'Showtime not found'
			})
		}

		// Add seats to showtime
		const seatUpdates = payment.seats.map((seat) => ({
			row: seat.row,
			number: seat.number,
			user: user._id
		}))

		showtime.seats.push(...seatUpdates)
		await showtime.save()

		// Add ticket to user
		await User.findByIdAndUpdate(user._id, {
			$push: {
				tickets: {
					showtime: payment.showtime,
					seats: payment.seats
				}
			}
		})

		res.status(200).json({
			success: true,
			message: 'Payment successful and booking confirmed',
			payment: {
				transactionId: transactionId,
				orderId: payment.orderId,
				amount: payment.amount,
				status: 'success'
			}
		})
	} catch (err) {
		console.error(err)
		res.status(400).json({ success: false, message: err.message || err })
	}
}

//@desc     Get payment details
//@route    GET /payment/:paymentId
//@access   Private
exports.getPaymentDetails = async (req, res, next) => {
	try {
		const payment = await Payment.findById(req.params.paymentId).populate([
			{ path: 'user', select: 'username email' },
			{
				path: 'showtime',
				populate: [
					{ path: 'movie', select: 'name img' },
					{
						path: 'theater',
						populate: { path: 'cinema', select: 'name' },
						select: 'number cinema'
					}
				]
			}
		])

		if (!payment) {
			return res.status(400).json({
				success: false,
				message: 'Payment not found'
			})
		}

		// Only allow user to see their own payment or admin
		if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
			return res.status(403).json({
				success: false,
				message: 'Not authorized to view this payment'
			})
		}

		res.status(200).json({
			success: true,
			data: payment
		})
	} catch (err) {
		console.error(err)
		res.status(400).json({ success: false, message: err.message || err })
	}
}

//@desc     Get user's payments
//@route    GET /payment/user
//@access   Private
exports.getUserPayments = async (req, res, next) => {
	try {
		const payments = await Payment.find({ user: req.user.id })
			.populate({
				path: 'showtime',
				populate: [
					{ path: 'movie', select: 'name img' },
					{
						path: 'theater',
						populate: { path: 'cinema', select: 'name' },
						select: 'number cinema'
					}
				]
			})
			.sort({ createdAt: -1 })

		res.status(200).json({
			success: true,
			count: payments.length,
			data: payments
		})
	} catch (err) {
		console.error(err)
		res.status(400).json({ success: false, message: err.message || err })
	}
}