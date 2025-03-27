'use client'
import { addMoodboard, clearDb, getAllMoodboards, initDb, MoodboardObject, MoodboardMini, deleteMoodboard } from "@/api/moodboard";
import { SyntheticEvent, useEffect, useState } from "react";
import Home from "./home";
import Image from "next/image";
import { RoundContainer } from "@/components/RoundContainer";
import Link from "next/link";

export default function LocalHome() {
  const [moodboards, setMoodboards] = useState<MoodboardMini[]>([]);

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

  const handleAddMoodboard = (name: string) => {
    
    const newMoodboard : MoodboardObject = {
      moodboardId: -1,
      moodboardName: name,
      moodboardData: ""
    }

    console.log(newMoodboard);

    addMoodboard(newMoodboard);
    window.location.reload();
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
    window.location.reload();
  };

  const handleClearDb = () => {
    clearDb();
    window.location.reload();
  }

  return (
    <div className="flex flex-col w-dvw h-dvh">
      <div className="flex px-4 justify-between items-center bg-gray-50 shadow-md border-b border-gray-300">
          <div className="flex flex-row justify-between gap-4 text-2xl m-4 font-bold h-fit items-center align-middle w-full text-gray-700">
            <div className="flex flex-row gap-4">
              <Image src="/splat-ref-icon.png" width={36} height={36 } alt="Icon of SplatRef"/>
              <div className="text-2xl font-bold text-gray-700">
                SplatRef
              </div>
              <div className="text-xl px-4 font-normal text-gray-600">
                Online Moodboards
              </div>
            </div>
            <RoundContainer className="m-0" hoverable={true}> 
              <Link href="/login" className="">
                <div className="text-lg px-4 font-normal text-gray-600">Login</div>
              </Link>
            </RoundContainer>
          </div>
        </div>
      <Home
        moodboards={moodboards}
        handleAddMoodboard={handleAddMoodboard}
        handleClearDb={handleClearDb}
        handleDeleteMoodboard={handleDeleteMoodboard}
        handleUploadMoodboard={handleUploadMoodboard}
        baseUrl="/moodboard/local"
      />
    </div>
  )
}
