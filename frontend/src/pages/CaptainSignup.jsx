import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TermModal from '../components/TermModal';

const CaptainSignup = () => {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [captainData, setCaptainData] = useState({})
    

    const submitHandler = (e)=> {
        e.preventDefault();
        setCaptainData({
            fullname:{
                firstName: firstName,
                lastName: lastName
            },
            email:email,
            password:password
        })
        setFirstName('')
        setLastName('')
        setEmail('')
        setPassword('')

    }
    return (
        <div className='p-7 h-screen flex flex-col justify-between'>
            
             <div>
             <img className='w-36 mb-3' src="https://static.vecteezy.com/system/resources/previews/027/127/451/non_2x/uber-logo-uber-icon-transparent-free-png.png" alt="CarBar Logo" />
            <form onSubmit={(e)=>{
                submitHandler(e)
            }}>
                <div>
                <h1 className='text-3xl font-semibold justify-center text-center pb-6'>Create Captain account</h1>
            </div>
               
                    <h3 className='text-xl mb-2'>What's your Name</h3>
            <div className='flex gap-3 mb-5'>
                <input
               
                required
                className='bg-[#eeeeee] w-1/2  rounded px-4 border text-base h-11 placeholder:text-sm'
                type="text" 
                placeholder='First name'
                value={firstName}
                onChange={(e)=>{
                    setFirstName(e.target.value)
                }}
                />
                 <input
               
                required
                className='bg-[#eeeeee] w-1/2  rounded px-4 border text-base h-11 placeholder:text-sm'
                type="text" 
                placeholder='Last name'
                value={lastName}
                onChange={(e)=>{
                    setLastName(e.target.value)
                }}
                />
        
        </div>
                <h3 className='text-xl mb-2'>What's your email</h3>

                <input
                value={email}
                onChange={(e)=>{
                    setEmail(e.target.value)

                }}
                required
                className='bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm'
                type="email" 
                placeholder='Email address'
                />

                <h3 className='text-xl mb-2'>Enter Password</h3>
                <input 
                 value={password}
                 onChange={(e)=>{
                     setPassword(e.target.value)
 
                 }}
                required
                className='bg-[#eeeeee] mb-6 rounded px-4 border w-full text-base h-11 placeholder:text-sm'
                type="password"
                placeholder='Set Password'
                /> 

                <button
                className='bg-[#111] text-[#fff] mb-7 rounded px-4 border w-full h-11 text-lg'
                
                >
                Login
                </button>  

                       
            </form>
            <p>Already have account? <Link to='/captain-login' 
            className='text-green-500 hover:text-green-600'
            >Login</Link> </p> 
             </div>

            <TermModal/>
        </div>
    );
};

export default CaptainSignup;