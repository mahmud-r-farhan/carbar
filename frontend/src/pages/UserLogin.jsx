import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const UserLogin = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [userData, setUserdata] = useState({})

    const submitHandler = (e)=> {
        e.preventDefault();
        setUserdata({
            email:email,
            password:password
        })
        setEmail('')
        setPassword('')
    }

    return (
        <div className='p-7 h-screen flex flex-col justify-between'>
             <div>
             <img className='w-20 mb-10' src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Uber_logo_2018.svg/1024px-Uber_logo_2018.svg.png" alt="CarBar Logo" />
            <form onSubmit={(e)=>{
                submitHandler(e)
            }}>

                <h3 className='text-xl mb-2'>What's your email</h3>

                <input
                value={email}
                onChange={(e)=>{
                    setEmail(e.target.value)

                }}
                required
                className='bg-[#eeeeee] mb-7 rounded px-4 border w-full text-lg h-11 placeholder:text-base'
                type="email" 
                placeholder='Type your email address'
                />

                <h3 className='text-xl mb-2'>Enter Password</h3>
                <input 
                 value={password}
                 onChange={(e)=>{
                     setPassword(e.target.value)
 
                 }}
                required
                className='bg-[#eeeeee] mb-7 rounded px-4 border w-full text-lg h-11 placeholder:text-base'
                type="password"
                placeholder='Type your Password'
                /> 

                <button
                className='bg-[#111] text-[#fff] mb-7 rounded px-4 border w-full h-11 text-lg'
                
                >
                Login
                </button>  

                       
            </form>
            <p>New? <Link to='/signup' 
            className='text-blue-500 hover:text-blue-600'
            >Create a new Account</Link> </p> 
          
             </div>

             <div>
                
                    <Link to='/captain-login'
                    className='text-green-600 hover:text-green-700'
                    >Sign in as Captain</Link>
             </div>
        </div>
    );
};

export default UserLogin;