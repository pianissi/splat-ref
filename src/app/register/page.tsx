'use client'
import { useEffect, useState } from "react";
import Cookies from 'js-cookie';
import { useRouter } from "next/navigation";
import { RoundContainer } from "@/components/RoundContainer";
import Image from "next/image";
import { CgSpinner } from "react-icons/cg";
import { Toast } from "radix-ui";
import { motion } from "motion/react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export default function Login(){
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const router = useRouter();

  const handleSubmit = async(e)=>{
    e.preventDefault();
    console.log(process.env.NEXT_PUBLIC_BACKEND_HOST);
    try{
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/register",{
        method: "POST",
        body: JSON.stringify({
          email: email,
          password: password,
          handle: handle,
          name: name
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/JSON",
        },
      });

      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const json = await response.json();
      console.log(json);
      console.log(response);
      setUser(json.handle);
      window.location.assign("/user/" + json.handle);
    } catch(error) {
      setToastOpen(true);
      console.log(error);
    }
  }

  return (
    <Toast.Provider duration={1000}>
      <div className="bg-gray-100 flex flex-col items-center">
        <div className="flex flex-col items-center p-4 h-dvh w-fit">
          <Link href="/"><Image className="m-4" src="/splat-ref-icon.png" width={64} height={64} alt="Icon of SplatRef"/></Link>
          <div className="flex flex-col align-middle items-center text-2xl font-bold p-2 text-gray-700">
            Register an Account
          </div>
          <RoundContainer className="flex justify-center items-center w-fit h-fit bg-gray-50 p-8 rounded-2xl">
            {!user ? (
            <div className="flex flex-col justify-center">
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col align-middle items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-700"> Email Address </label>
                    <input
                      type="text"
                      className="w-auto border border-gray-300 rounded-md p-2 text-gray-500 focus:outline-gray-500"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                  <label className="text-gray-700"> Password </label>
                    <input
                      type="password"
                      className="w-auto border border-gray-300 rounded-md p-2 text-gray-500 focus:outline-gray-500"
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-700"> Handle </label>
                    <input
                      type="text"
                      className="w-auto border border-gray-300 rounded-md p-2 text-gray-500 focus:outline-gray-500"
                      onChange={(e) => setHandle(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-gray-700"> Name </label>
                    <input
                      type="text"
                      className="w-auto border border-gray-300 rounded-md p-2 text-gray-500 focus:outline-gray-500"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <RoundContainer hoverable={true} className="p-0 m-0 mt-4 w-full bg-gray-700 hover:bg-gray-500">
                    <button type="submit" className="text-md font-normal p-2 w-full text-gray-50">
                      Register
                    </button>
                  </RoundContainer>
                </div>
              </form>
            </div>) : 
            <CgSpinner className="animate-spin text-gray-500" size="4em"/>}
          </RoundContainer>
          <div className="flex flex-row justify-between w-full">
            <div className="text-2xl font-bold p-2 text-gray-700 self-start">
              <RoundContainer hoverable={true} className="m-0 p-0 h-fit">
                <Link className="block overflow-hidden m-0 p-0" href="/">
                  <FiArrowLeft className="m-2" color="#666666" size="1em"></FiArrowLeft>
                </Link>
              </RoundContainer>
            </div>
          </div>
          <Toast.Root className="" duration={2000} open={toastOpen} onOpenChange={setToastOpen}>
            <motion.div initial={{y: -50}} animate={{y: 0}}>
              <RoundContainer className="flex flex-col justify-center items-center p-4 rounded-lg">
                <Toast.Title asChild >
                  <div className="text-gray-700 text-lg">
                    Login Failed
                  </div>
                </Toast.Title>
                <Toast.Description asChild>
                  <div className="text-gray-500 text-md">
                    Please try again
                  </div>
                </Toast.Description>
              </RoundContainer>
            </motion.div>
            {/* <Toast.Action /> */}
          </Toast.Root>
  
          <Toast.Viewport className="h-full flex-1 w-full justify-end items-center p-8"/>
        </div>
      </div>
    </Toast.Provider>
    
  )
}