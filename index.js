import React from 'react'
import { Link } from 'gatsby'
import Layout from '../components/layout'
import Image from '../components/image'
import Checkout from '../components/checkout'

const Index = () => (
    <Layout>
        <h1>My Shop</h1>
        <Link to='/page-2/'>Products</Link>
        <div style={{ maxWidth: `300px`, marginBottom: `1.45rem` }}>
            <Image />
        </div>
        <Checkout />
    </Layout>
)

export default Index