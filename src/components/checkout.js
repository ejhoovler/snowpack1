import React, { useState } from 'react'
import { ReactDOM } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'


class Checkout extends React.Component {
    handleSubmit = async (event) => {
        event.preventDefault();
        const {stripe, elements} = this.props;
        const {error, paymentMethod} = await stripe.createPaymentMethod({
            type: 'card',
            card: elements.getElement(CardElement),
        });
    };

    render() {
        const {stripe} = this.props;
        return (
            <form onSubmit={this.handleSubmit}>
                <CardElement />
                <button type="submit" disabled={!stripe}>
                    Pay
                </button>
            </form>
        );
    }
}

const stripePromise = loadStripe('pk_test_hDo3t2WzH4X1xsRn7y4wCZ4200IxpfytNd');
const App = () => (
    <Elements stripe={stripePromise}>

    </Elements>
)


ReactDOM.render(<App />, document.body);