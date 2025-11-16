import { CreditCardIcon, TicketIcon, XMarkIcon } from '@heroicons/react/24/solid'
import axios from 'axios'
import { useContext, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Navbar from '../components/Navbar'
import ShowtimeDetails from '../components/ShowtimeDetails'
import { AuthContext } from '../context/AuthContext'

const Purchase = () => {
	const navigate = useNavigate()
	const { auth } = useContext(AuthContext)
	const location = useLocation()
	const showtime = location.state.showtime
	const selectedSeats = location.state.selectedSeats || []
	const [showPaymentModal, setShowPaymentModal] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [orderId, setOrderId] = useState('')
	const [paymentId, setPaymentId] = useState('')

	// Payment form state
	const [cardNumber, setCardNumber] = useState('')
	const [cardholderName, setCardholderName] = useState('')
	const [expiryMonth, setExpiryMonth] = useState('')
	const [expiryYear, setExpiryYear] = useState('')
	const [cvv, setCvv] = useState('')

	// Calculate total amount (₹200 per seat)
	const PRICE_PER_SEAT = 200
	const totalAmount = selectedSeats.length * PRICE_PER_SEAT

	const handleProceedToPayment = async () => {
		setIsProcessing(true)
		try {
			// Create order
			const orderResponse = await axios.post(
				'/payment/create-order',
				{
					showtimeId: showtime._id,
					seats: selectedSeats,
					amount: totalAmount
				},
				{
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				}
			)

			if (orderResponse.data.success) {
				setOrderId(orderResponse.data.order.id)
				setPaymentId(orderResponse.data.order.paymentId)
				setShowPaymentModal(true)
			}
		} catch (error) {
			console.error(error)
			toast.error(error.response?.data?.message || 'Error creating order', {
				position: 'top-center',
				autoClose: 2000,
				pauseOnHover: false
			})
		} finally {
			setIsProcessing(false)
		}
	}

	const formatCardNumber = (value) => {
		const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
		const matches = v.match(/\d{4,16}/g)
		const match = (matches && matches[0]) || ''
		const parts = []

		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4))
		}

		if (parts.length) {
			return parts.join(' ')
		} else {
			return value
		}
	}

	const handleCardNumberChange = (e) => {
		const formatted = formatCardNumber(e.target.value)
		if (formatted.replace(/\s/g, '').length <= 16) {
			setCardNumber(formatted)
		}
	}

	const handleProcessPayment = async (e) => {
		e.preventDefault()
		setIsProcessing(true)

		try {
			const response = await axios.post(
				'/payment/process',
				{
					paymentId: paymentId,
					cardNumber: cardNumber.replace(/\s/g, ''),
					cardholderName: cardholderName,
					expiryMonth: expiryMonth,
					expiryYear: expiryYear,
					cvv: cvv
				},
				{
					headers: {
						Authorization: `Bearer ${auth.token}`
					}
				}
			)

			if (response.data.success) {
				toast.success('Payment successful! Booking confirmed.', {
					position: 'top-center',
					autoClose: 3000,
					pauseOnHover: false
				})
				navigate('/ticket')
			}
		} catch (error) {
			console.error(error)
			toast.error(error.response?.data?.message || 'Payment failed. Please try again.', {
				position: 'top-center',
				autoClose: 3000,
				pauseOnHover: false
			})
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-indigo-900 to-blue-500 pb-8 sm:gap-8">
			<Navbar />
			<div className="mx-4 h-fit rounded-lg bg-gradient-to-br from-indigo-200 to-blue-100 p-4 drop-shadow-xl sm:mx-8 sm:p-6">
				<ShowtimeDetails showtime={showtime} />
				<div className="flex flex-col justify-between rounded-b-lg bg-gradient-to-br from-indigo-100 to-white text-center text-lg drop-shadow-lg md:flex-row">
					<div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-6">
						<div className="flex flex-col items-center gap-x-4 md:flex-row">
							<p className="font-semibold">Selected Seats:</p>
							<p className="text-start">{selectedSeats.join(', ')}</p>
							{!!selectedSeats.length && (
								<p className="whitespace-nowrap">({selectedSeats.length} seats)</p>
							)}
						</div>
						{!!selectedSeats.length && (
							<div className="flex items-center gap-2 text-xl font-bold text-indigo-800">
								<p>Total:</p>
								<p>₹{totalAmount}</p>
							</div>
						)}
					</div>
					{!!selectedSeats.length && (
						<button
							onClick={handleProceedToPayment}
							className="flex items-center justify-center gap-2 rounded-b-lg bg-gradient-to-br from-indigo-600 to-blue-500 px-4 py-3 font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-500 disabled:to-slate-400 md:rounded-none md:rounded-br-lg"
							disabled={isProcessing}
						>
							{isProcessing ? (
								'Processing...'
							) : (
								<>
									<p>Proceed to Payment</p>
									<CreditCardIcon className="h-6 w-6 text-white" />
								</>
							)}
						</button>
					)}
				</div>
			</div>

			{/* Payment Modal */}
			{showPaymentModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
					<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
							<button
								onClick={() => setShowPaymentModal(false)}
								className="rounded-full p-1 hover:bg-gray-100"
								disabled={isProcessing}
							>
								<XMarkIcon className="h-6 w-6 text-gray-600" />
							</button>
						</div>

						<div className="mb-4 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 p-4 text-white">
							<p className="text-sm opacity-90">Order ID</p>
							<p className="font-mono text-xs">{orderId}</p>
							<p className="mt-2 text-2xl font-bold">₹{totalAmount}</p>
							<p className="text-sm opacity-90">{selectedSeats.length} seats</p>
						</div>

						<form onSubmit={handleProcessPayment} className="space-y-4">
							<div>
								<label className="mb-1 block text-sm font-semibold text-gray-700">
									Card Number
								</label>
								<input
									type="text"
									value={cardNumber}
									onChange={handleCardNumberChange}
									placeholder="1234 5678 9012 3456"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
									required
								/>
							</div>

							<div>
								<label className="mb-1 block text-sm font-semibold text-gray-700">
									Cardholder Name
								</label>
								<input
									type="text"
									value={cardholderName}
									onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
									placeholder="JOHN DOE"
									className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
									required
								/>
							</div>

							<div className="flex gap-4">
								<div className="flex-1">
									<label className="mb-1 block text-sm font-semibold text-gray-700">
										Expiry Month
									</label>
									<select
										value={expiryMonth}
										onChange={(e) => setExpiryMonth(e.target.value)}
										className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
										required
									>
										<option value="">MM</option>
										{Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
											<option key={month} value={month.toString().padStart(2, '0')}>
												{month.toString().padStart(2, '0')}
											</option>
										))}
									</select>
								</div>
								<div className="flex-1">
									<label className="mb-1 block text-sm font-semibold text-gray-700">
										Expiry Year
									</label>
									<select
										value={expiryYear}
										onChange={(e) => setExpiryYear(e.target.value)}
										className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
										required
									>
										<option value="">YYYY</option>
										{Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(
											(year) => (
												<option key={year} value={year}>
													{year}
												</option>
											)
										)}
									</select>
								</div>
								<div className="w-24">
									<label className="mb-1 block text-sm font-semibold text-gray-700">CVV</label>
									<input
										type="text"
										value={cvv}
										onChange={(e) => {
											const value = e.target.value.replace(/\D/g, '')
											if (value.length <= 3) setCvv(value)
										}}
										placeholder="123"
										className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
										maxLength="3"
										required
									/>
								</div>
							</div>

							<div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
								<p className="font-semibold">💳 Test Cards:</p>
								<p className="mt-1">
									<strong>Success:</strong> 4111 1111 1111 1111
								</p>
								<p>
									<strong>Failed:</strong> 4111 1111 1111 1113
								</p>
								<p className="mt-1 text-xs">Any CVV and future expiry date</p>
							</div>

							<button
								type="submit"
								className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 px-4 py-3 font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:from-slate-500 disabled:to-slate-400"
								disabled={isProcessing}
							>
								{isProcessing ? (
									'Processing Payment...'
								) : (
									<>
										<TicketIcon className="h-5 w-5" />
										Pay ₹{totalAmount}
									</>
								)}
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default Purchase