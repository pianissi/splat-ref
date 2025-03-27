'use client'
import { useState } from "react";
import Cookies from 'js-cookie';
import { useRouter } from "next/navigation";

export default function Login(){
  const [user, setUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  const handleSubmit = async(e)=>{
    e.preventDefault();
    console.log(process.env.NEXT_PUBLIC_BACKEND_HOST);
    try{
      const response = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/login",{
        method: "POST",
        body: JSON.stringify({
          email: email,
          password: password
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
      // Cookies.set('accessToken', "Bearer " + json?.accessToken);

      // const accessToken = Cookies.get('accessToken');
      // if (!accessToken)
      //   return;
      // const response2 = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/all",{
      //   method: "GET",
      //   headers: new Headers({
      //     "Authorization": accessToken,
      //   }),
      // });

      // if (!response2.ok) {
      //   throw new Error(`Response status: ${response.status}`);
      // }
      // const json2 = await response2.json();
      // console.log(json2);

      // const response3 = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/refresh",{
      //   method: "POST",
      //   credentials: "include",
      // });

      // if (!response.ok) {
      //   throw new Error(`Response status: ${response.status}`);
      // }
      // const json3 = await response3.json();
      window.location.assign("/user/" + json.handle);
    } catch(error) {
      console.log(error);
    }
  }

  return (
    <div className="">
      {!user ? (
      <div className="">
        <form onSubmit={handleSubmit}>
          <span className="">Lama Login</span>
          <input
            type="text"
            placeholder="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="submitButton">
            Login
          </button>
        </form>
      </div>) : 
      <span> User has been loggedIn </span>}
    </div>
  )
}