'use client'
import { useEffect } from "react";
import { RoundContainer } from "@/components/RoundContainer";
import Image from "next/image";
import { CgSpinner } from "react-icons/cg";
import { Toast } from "radix-ui";

export default function Login(){

  useEffect(() => {
    const revokeRefreshToken = async () => {
      try {
        console.log("test");
          // first init token
        const refreshResponse = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/logout",{
          method: "DELETE",
          credentials: "include",
        });
        if (!refreshResponse.ok) {
          throw new Error(`Response status: ${refreshResponse.status}`);
        }
        
      } catch(error) {
        console.log(error);
      }

      window.location.assign("/")
    }
    revokeRefreshToken();
  }, []);


  return (
    <Toast.Provider duration={1000}>
      <div className="flex flex-col items-center p-4 h-dvh w-dvw bg-gray-100">
        <Image className="m-4" src="/splat-ref-icon.png" width={64} height={64} alt="Icon of SplatRef"/>
        <div className="flex flex-col align-middle items-center text-2xl font-bold p-2 text-gray-700">
          Logging out
        </div>
        <RoundContainer className="flex justify-center items-center w-fit h-fit bg-gray-50 p-8 rounded-2xl">
          <CgSpinner className="animate-spin text-gray-500" size="4em"/>
        </RoundContainer>

        <Toast.Viewport className="h-full flex-1 w-full justify-end items-center p-8"/>
      </div>
	  </Toast.Provider>
    
  )
}