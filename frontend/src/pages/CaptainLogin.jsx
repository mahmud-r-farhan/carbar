import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CaptainLogin = () => {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [captainData, setCaptainData] = useState({})

    const submitHandler = (e)=> {
        e.preventDefault();
        setCaptainData({
            email:email,
            password:password
        })
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
       <p>New? <Link to='/captain-signup' 
       className='text-green-500 hover:text-green-600'
       >Join Now</Link> </p> 
        </div>

        <div>
               <Link to='/login'
               className='text-blue-600 hover:text-blue-700'
               >Sign in as User</Link>
        </div>
   </div>
    );
};

export default CaptainLogin;