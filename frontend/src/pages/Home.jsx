import React from 'react';
import { Link } from 'react-router-dom';


const Home = () => {
    return (
        <div>
            <div className='bg-cover bg-bottom bg-[url(assets\images\home-screen.jpg)] h-screen pt-8 flex w-full justify-between flex-col bg-red-400'>
                <img className='w-20 ml-10' src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Uber_logo_2018.svg/1024px-Uber_logo_2018.svg.png" alt="CarBar Logo" />
                <div className='bg-white pb-7 py-4 px-4'>
                    <h2 className='text-3xl font-bold'>Get Started with CarBar</h2>
                    <Link to='/login' className='flex items-center justify-center w-full bg-black text-white py-3 rounded mt-5'>Continue</Link>
                </div>

            </div>
   
        </div>
    );
};

export default Home;