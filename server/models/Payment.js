const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: true
		},
		showtime: {
			type: mongoose.Schema.ObjectId,
			ref: 'Showtime',
			required: true
		},
		seats: [
			{
				row: { type: String, required: true },
				number: { type: Number, required: true }
			}
		],
		amount: {
			type: Number,
			required: true
		},
		orderId: {
			type: String,
			required: true,
			unique: true
		},
		transactionId: {
			type: String
		},
		paymentMethod: {
			type: String,
			enum: ['card', 'upi', 'netbanking', 'wallet'],
			default: 'card'
		},
		cardLast4: {
			type: String
		},
		cardholderName: {
			type: String
		},
		status: {
			type: String,
			enum: ['pending', 'success', 'failed'],
			default: 'pending'
		}
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Payment', paymentSchema)