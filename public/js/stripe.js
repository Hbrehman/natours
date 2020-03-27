/* eslint-disable */
var stripe = Stripe('pk_test_XVf4NiQV4j1jtFcv8uzK4qzm00m7IGKj9C');
import axios from 'axios';

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    console.log(session);
    // 2) Create checkout from + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (ex) {
    console.log(ex);
  }
};
