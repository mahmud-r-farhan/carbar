import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TermModal from '../components/TermModal';

const UserSignUp = () => {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [userData, setUserData] = useState('')
    

    const submitHandler = (e)=> {
        e.preventDefault();
        setUserData({
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
             <img className='w-20 mb-10' src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Uber_logo_2018.svg/1024px-Uber_logo_2018.svg.png" alt="CarBar Logo" />
            <form onSubmit={(e)=>{
                submitHandler(e)
            }}>
                
               
                    <h3 className='text-xl mb-2'>What's your name</h3>
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
            <p>Already have account? <Link to='/login' 
            className='text-blue-500 hover:text-blue-600'
            >Login</Link> </p> 
             </div>

            <TermModal/>
        </div>
    );
};

export default UserSignUp;