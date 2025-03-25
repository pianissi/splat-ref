'use client'
import { RoundContainer } from "@/components/RoundContainer";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";

const mockData = [{"moodboardId": 1}, {"moodboardId": 2}];

export default function Home() {
  const [moodboardIds, setMoodboardIds] = useState<MoodboardMini[]>([{
    moodboardId: 1,
    moodboardName: "Moodboard 1"
  }]);

  const moodboards = [];
  for (const moodboardId of moodboardIds) {
    moodboards.push(<MoodboardLink key={moodboardId.moodboardId}/>);
  }

  const addMoodboard = () => {
    setMoodboardIds(
      [
        ...moodboardIds,
        {moodboardId: moodboardIds.slice(-1)[0].moodboardId + 1}
      ]
    )
  };

  return (
    <div className="flex flex-col justify-start h-screen w-screen bg-gray-100">
      <div className="flex px-2 justify-between items-center bg-gray-100 shadow-md border-b border-gray-300">
        <div className="text-2xl m-4 font-bold h-fit w-auto">
          Your Moodboards
        </div>
        <RoundContainer hoverable={true}>
          <div className="m-2">
            Login
          </div>
        </RoundContainer>
      </div>
      <div className="flex flex-col p-4 justify-between h-full">
        <div className="flex p-4">
          {moodboards}
        </div>
        <div className="flex flex-row-reverse">
          <MoodboardDialog onClick={addMoodboard}/>
        </div>
      </div>
    </div>
  );
}

function MoodboardLink() {
  return <Link className="m-2 h-fit flex shrink-0 p-6 bg-white hover:bg-slate-200 rounded-xl shadow-lg justify-center " href="/moodboard/1">To moodboard</Link>;
}

function MoodboardDialog({onClick}: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="block bg-white justify-center align-middle m-4 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500" onClick={onClick}>
          <FiPlus className="m-2" size="1.5em"></FiPlus>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#000000a9]"/>
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg">
          <Dialog.Title className="text-xl font-bold">Add moodboard</Dialog.Title>
          <fieldset className="py-2 flex">
            <label htmlFor="name" className="pr-2 py-2">
              Name
            </label>
            <input id="name" className="unset p-2 rounded-md flex outline-gray-400 outline-dashed outline-1 focus:outline focus:outline-2 focus:gray-600" defaultValue="New Moodboard"/>
          </fieldset>
          <div className="flex justify-end">
             <Dialog.Close asChild>
               <button className="block bg-white justify-center align-middle m-2 p-2 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500" onClick={onClick}>
                 Add
               </button>
             </Dialog.Close>
           </div>
           <Dialog.Close asChild>
             <button className="block absolute top-2 right-2">
               <FiX className="m-2" size="1.2em"></FiX>
             </button>
           </Dialog.Close>
         </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface Props {
  onClick?: ()=>void,
}