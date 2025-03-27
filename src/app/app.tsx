'use client'
import { addMoodboard, clearDb, getAllMoodboards, initDb, MoodboardObject, MoodboardMini, deleteMoodboard } from "@/api/moodboard";
import Link from "next/link";
import { Dialog, DropdownMenu } from "radix-ui";
import { FormEventHandler, ReactElement, SyntheticEvent, useEffect, useState } from "react";
import { FiMoreVertical, FiPlus, FiTrash, FiUpload, FiX } from "react-icons/fi";
import Image from "next/image";
import Home from "./home";

export default function LocalHome() {
  const [moodboards, setMoodboards] = useState<MoodboardMini[]>([]);

  const moodboardsData : React.JSX.Element[] = [];
  for (const moodboard of moodboards) {
    const loadMoodboard = (thumbnailUrl: string | undefined) => {

      console.log(thumbnailUrl);
      moodboardsData.push(
        <MoodboardLink key={moodboard.moodboardId} moodboardId={moodboard.moodboardId}>
          <div className="overflow-hidden">
            <div className="flex justify-between">
              <div className="text-gray-500 text-nowrap text-ellipsis overflow-hidden text-lg">
                {moodboard.moodboardName}
                
              </div>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="rounded-lg transition focus:outline-none hover:bg-slate-300">
                    <FiMoreVertical color="#666666" size="1em"/>
                  </button>        
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-white p-2 rounded-lg shadow-lg cursor-pointer">
                    <DropdownMenu.Item onClick={(event) => {
                      handleDeleteMoodboard(event, moodboard.moodboardId);
                    }} className="flex flex-row items-center gap-2 px-4 py-1 text-gray-500 rounded-md transition hover:bg-red-500 hover:text-white">
                      Delete <FiTrash/>
                    </DropdownMenu.Item>
                    <DropdownMenu.Arrow className="fill-white"/>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
            <div className="my-4"/>
            <div className="rounded-lg overflow-hidden max-h-28 lg:max-h-44">
              {thumbnailUrl ?
                <Image alt="" src={thumbnailUrl} height={500} width={500} className=""/> :
                <div className="bg-gray-300 h-56 w-screen">
                </div>
              }
            </div>
          </div>
        </MoodboardLink>
      );
    }

    loadMoodboard(moodboard.thumbnailUrl);
  }

  useEffect(() => {
    async function init() {
      await initDb();

      const moodboards = await getAllMoodboards();

      console.log(moodboards);

      if (moodboards === null)
        return;
      const moodboardsData : MoodboardMini[] = [];
      const promises : Promise<void>[] = [];
      for (const moodboard of moodboards) {
        let id = 0;
        if (!moodboard.moodboardId)
          id = -1;
        else 
          id = moodboard.moodboardId;

        if (moodboard.thumbnail) {
          promises.push(fetch(moodboard.thumbnail.data).then(res => res.blob()).then((myBlob) => {
            const objectURL = URL.createObjectURL(myBlob);
            console.log("logigng");
            console.log(objectURL);
            console.log(moodboard.thumbnail?.data);
            const moodboardData = {
              moodboardId: id,
              moodboardName: moodboard.moodboardName,
              thumbnailUrl: objectURL,
            }
            moodboardsData.push(moodboardData);
          }));
        } else {
          const moodboardData = {
            moodboardId: id,
            moodboardName: moodboard.moodboardName,
          }
          moodboardsData.push(moodboardData);
        }
        
      }
      await Promise.all(promises);
      moodboardsData.sort((a, b) => {
        if (a.moodboardId && b.moodboardId)
          if (a.moodboardId > b.moodboardId)
            return 1;
          return -1;
        return 1;
      })
      setMoodboards(moodboardsData);
    }

    init();

    console.log("init");
  }, []);

  const handleDeleteMoodboard = async (event: SyntheticEvent<HTMLDivElement>, moodboardId: number) => {
    event.stopPropagation();
    await initDb();
    deleteMoodboard(moodboardId);
    window.location.reload();
  }

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
    <Home/>
  );
}