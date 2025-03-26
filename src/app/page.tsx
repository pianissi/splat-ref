'use client'
import { addMoodboard, clearDb, getAllMoodboards, initDb, MoodboardObject, MoodboardMini } from "@/api/moodboard";
import { RoundContainer } from "@/components/RoundContainer";
import { deleteDB } from "idb";
import Link from "next/link";
import { Dialog, Form } from "radix-ui";
import { FormEvent, FormEventHandler, ReactElement, SyntheticEvent, useEffect, useState } from "react";
import { FiPlus, FiTrash, FiUpload, FiX } from "react-icons/fi";
import { MoodboardSerial } from "./moodboard/[moodboardId]/types";

export default function Home() {
  const [moodboards, setMoodboards] = useState<MoodboardMini[]>([]);

  const moodboardsData = [];
  for (const moodboard of moodboards) {
    moodboardsData.push(
      <MoodboardLink key={moodboard.moodboardId} moodboardId={moodboard.moodboardId}>
        <div className="text-gray-500">
          {moodboard.moodboardName}
        </div>
      </MoodboardLink>
    );
  }

  useEffect(() => {
    async function init() {
      await initDb();

      const moodboards = await getAllMoodboards();

      console.log(moodboards);

      if (moodboards === null)
        return;
      const moodboardsData : MoodboardMini[] = [];
      for (const moodboard of moodboards) {
        let id = 0;
        if (!moodboard.moodboardId)
          id = -1;
        else 
          id = moodboard.moodboardId;
        const moodboardData = {
          moodboardId: id,
          moodboardName: moodboard.moodboardName,
          thumbnail: moodboard.thumbnail,
        }

        moodboardsData.push(moodboardData);
      }

      setMoodboards(moodboardsData);
    }

    init();

    console.log("init");
  }, []);

  const handleAddMoodboard = (event: SyntheticEvent<HTMLFormElement>) => {
    
    const target = event.target as typeof event.target & {
      name: {value: string};
    };
    console.log(target);

    const newMoodboard : MoodboardObject = {
      moodboardId: -1,
      moodboardName: target.name.value,
      moodboardData: ""
    }

    console.log(newMoodboard);

    addMoodboard(newMoodboard);
    console.log("yes");
    
  };

  const handleUploadMoodboard = (jsonString: string) => {
    // event.preventDefault();
    // const target = event.target as typeof event.target & {
    //   moodboardFile: {value: File};
    // };
    const moodboardObj = JSON.parse(jsonString);
    console.log(moodboardObj);

    if (!("name" in moodboardObj))
      return;

    const newMoodboard : MoodboardObject = {
      moodboardId: -1,
      moodboardName: moodboardObj.name,
      moodboardData: jsonString,
    }

    console.log(newMoodboard);

    addMoodboard(newMoodboard);
    
  };

  return (
    <div className="flex flex-col justify-start h-dvh w-dvw bg-gray-100">
      <div className="flex px-2 justify-between items-center bg-gray-100 shadow-md border-b border-gray-300">
        <div className="text-2xl m-4 font-bold h-fit w-auto text-gray-700">
          Your Moodboards
        </div>
        <RoundContainer hoverable={true}>
          <div className="m-2 text-gray-700">
            Login
          </div>
        </RoundContainer>
      </div>
      <div className="flex flex-col p-4 justify-between h-full">
        <div className="flex p-4">
          {moodboardsData}
        </div>
        <div className="flex flex-row-reverse items-baseline">
          <MoodboardDialog handleSubmit={handleAddMoodboard}/>
          <UploadMoodboardDialog handleSubmit={handleUploadMoodboard}></UploadMoodboardDialog>
          <DeleteDialog handleSubmit={() => {
            clearDb();
          }}/>
          
        </div>
      </div>
    </div>
  );
}

function MoodboardLink({children, moodboardId}: {children: ReactElement, moodboardId: number}) {
  return (
    <Link className="m-2 h-fit flex shrink-0 p-6 shadow-gray-300 bg-white rounded-xl shadow-lg justify-center transition hover:bg-slate-200 hover:shadow-xl hover:shadow-gray-400" href={`/moodboard/${moodboardId.toString()}`}>
      {children}
    </Link>
  );
}

function MoodboardDialog({handleSubmit}: Props) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="block bg-white justify-center align-middle m-4 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
          <FiPlus className="m-2" color="#666666" size="4em"></FiPlus>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#000000a9]"/>
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg">
          <Dialog.Title className="text-xl font-bold text-gray-700">Add moodboard</Dialog.Title>
          <form method="post" onSubmit={handleSubmit}>
            <fieldset className="py-2 flex">
              <label htmlFor="name" className="pr-2 py-2 text-gray-500">
                Name
              </label>
              <input id="name" className="unset p-2 rounded-md flex outline-gray-400 text-gray-500 outline-dashed outline-1 focus:outline focus:outline-2 focus:gray-600" defaultValue="New Moodboard"/>
            </fieldset>
            <div className="flex justify-end">
              <button type="submit" className="block text-gray-500 bg-white justify-center align-middle m-2 p-2 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
                Add
              </button>
            </div>
          </form>
           <Dialog.Close asChild>
             <button className="block absolute top-2 right-2">
               <FiX className="m-2" color="#666666" size="1.2em"></FiX>
             </button>
           </Dialog.Close>
         </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteDialog({handleSubmit}: {handleSubmit?: () => void}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="block bg-red-500 justify-center h-fit align-middle m-1 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
          <FiTrash className="m-2" color="#eeeeee" size="1.5em"></FiTrash>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#000000a9]"/>
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg">
          <Dialog.Title className="text-xl font-bold text-gray-700 pb-2">Delete all moodboards!</Dialog.Title>
          <Dialog.Description className="text-md text-gray-500 py-2">Please be very sure you want to delete all moodboards!</Dialog.Description>
          <form method="post" onSubmit={handleSubmit}>
            <div className="flex justify-end">
                
                <button type="submit" className="block text-gray-500 bg-white justify-center align-middle m-2 p-2 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
                  Cancel
                </button>
                <button type="submit" className="block text-gray-100 bg-red-500 justify-center align-middle m-2 p-2 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-red-400 hover:shadow-md hover:shadow-gray-500">
                  Delete!
                </button>
            </div>
          </form>
           <Dialog.Close asChild>
             <button className="block absolute top-2 right-2">
               <FiX className="m-2" color="666666" size="1.2em"></FiX>
             </button>
           </Dialog.Close>
         </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function UploadMoodboardDialog({handleSubmit}: {handleSubmit?: (arg0 : string) => void}) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = (e: FormEvent<HTMLFormElement>) => {
    if (file) {
      console.log('Uploading file...');

      const handleFileSubmit = (e: ProgressEvent<FileReader>) => {
        const content = fileReader.result;
        console.log(content);
        if (!content)
          return;
        if (content instanceof ArrayBuffer)
          return;
        if (handleSubmit) {
          console.log("submitting")
          handleSubmit(content);
        }
          
      }

      const fileReader = new FileReader();
      if (handleFileSubmit)
        fileReader.onloadend = handleFileSubmit;
      fileReader.readAsText(file)

    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="block bg-white justify-center align-middle m-4 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
          <FiUpload className="m-2" color="#666666" size="1.5em"></FiUpload>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[#000000a9]"/>
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-5 rounded-lg">
          <Dialog.Title className="text-xl font-bold pr-10">Upload saved moodboards</Dialog.Title>
          <form method="post" onSubmit={handleUpload}>
            <fieldset className="py-2 flex justify-center">
              <label htmlFor="moodboardFile" className="pr-2 py-2">
                Add your file here!
              </label>
              <input id="moodboardFile" type="file" accept="application/JSON" onChange={handleFileChange} className="p-2 rounded-md flex outline-gray-400 outline-dashed outline-1 focus:outline focus:outline-2 focus:gray-600"/>
            </fieldset>
            <div className="flex justify-end">
              <button type="submit" className="block bg-white justify-center align-middle m-2 p-2 rounded-full shadow-sm border border-gray-300 shadow-gray-400 transition hover:bg-slate-200 hover:shadow-md hover:shadow-gray-500">
                Upload
              </button>
            </div>
          </form>
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
  handleSubmit?: FormEventHandler<HTMLFormElement>,
}