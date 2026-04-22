import { useContext } from "react";
import { AuthContext } from "../authContext";
import { login, register, logout } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context


    const handleLogin = async ({ email, password }) => {
    setLoading(true)
    try {
        const data = await login({ email, password })
        if (!data?.user) {
            return { success: false, message: "Invalid email or password" }
        }
        setUser(data.user)
        return { success: true }
    } catch (err) {
        const message = err.response?.data?.message || "Login failed"
        return { success: false, message }
    } finally {
        setLoading(false)
    }
}

    const handleRegister = async ({ username, email, password }) => {
    setLoading(true)
    try {
        await register({ username, email, password })
        return { success: true }
    } catch (err) {
        const message = err.response?.data?.message || "Registration failed"
        return { success: false, message }
    } finally {
        setLoading(false)
    }
}

    const handleLogout = async () => {
        setLoading(true)
        try {
            await logout()
            setUser(null)
            return true;
        } catch (err) {
            console.log(err)
            setUser(null);
            throw err;
        } finally {
            setLoading(false)
        }
    }

    return { user, loading, handleRegister, handleLogin, handleLogout }
}