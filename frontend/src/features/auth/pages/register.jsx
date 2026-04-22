import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const Register = () => {

    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const { loading, handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Case 1: Empty fields
        if (!username.trim() || !email.trim()) {
            toast.error("Username and email are required")
            return
        }

        const result = await handleRegister({ username, email, password })

        if (result.success) {
            // Case 2: Success
            toast.success("User registered successfully!")
            setTimeout(() => navigate("/login"), 2000)
        } else {
            // Case 3: Already exists (use server message directly)
            toast.error(result.message)
        }
    }

    if (loading) {
        return (<main><h1>Loading.......</h1></main>)
    }

    return (
        <main>
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="form-container">
                <h1>Register</h1>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            onChange={(e) => setUsername(e.target.value)}
                            type="text" id="username" name='username' placeholder='Enter username' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => setEmail(e.target.value)}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => setPassword(e.target.value)}
                            type="password" id="password" name='password' placeholder='Enter password' />
                    </div>

                    <button className='button primary-button'>Register</button>
                </form>

                <p>Already have an account? <Link to={"/login"}>Login</Link></p>
            </div>
        </main>
    )
}

export default Register