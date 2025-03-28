'use client'
import { MoodboardMini } from "@/api/moodboard";
import { SyntheticEvent, useCallback, useEffect, useState } from "react";
import Home from "../../home";
import { useParams } from "next/navigation";
import Image from "next/image";
import { RoundContainer } from "@/components/RoundContainer";
import Link from "next/link";
import { isBrowser } from "react-device-detect";

export default function OnlineHome() {
  const [accessToken, setAccessToken] = useState<string>();
  const [moodboards, setMoodboards] = useState<MoodboardMini[]>([]);
  
  const params = useParams<{handle: string}>();

  const refreshAccessToken = useCallback(async () => {
    try {
      console.log("test");
        // first init token
      const refreshResponse = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/refresh",{
        method: "POST",
        credentials: "include",
      });

      if (!refreshResponse.ok) {
        throw new Error(`Response status: ${refreshResponse.status}`);
      }

      const refreshJson = await refreshResponse.json();

      // console.log(json);

      if (params.handle !== refreshJson.handle) {
        window.location.assign("/user/" + refreshJson.handle);
      }
      
      const tempAccessToken = refreshJson.accessToken;
      
      setAccessToken(tempAccessToken);

      return tempAccessToken;
    } catch (error) {
      console.log(error);
      window.location.assign("/");
    }
  }, [params.handle]);

  // TODO what if access token expires
  useEffect(() => {
    async function init() {
      const tempAccessToken = await refreshAccessToken();

      const getMoodboardsResponse = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/all",{
        method: "GET",
        credentials: "include",
        headers: new Headers({
          "Authorization": "Bearer " + tempAccessToken,
        }),
      });

      const moodboards = await getMoodboardsResponse.json();

      console.log(moodboards[0]);

      // return;
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

        if (Object.keys(moodboard.thumbnail).length > 0) {
          promises.push(fetch(moodboard.thumbnail.data).then(res => res.blob()).then((myBlob) => {
            const objectURL = URL.createObjectURL(myBlob);
            console.log("logigng");
            console.log(objectURL);
            console.log(moodboard.thumbnail?.data);
            const moodboardData = {
              moodboardId: id,
              moodboardName: moodboard.name,
              thumbnailUrl: objectURL,
            }
            moodboardsData.push(moodboardData);
          }));
        } else {
          const moodboardData = {
            moodboardId: id,
            moodboardName: moodboard.name,
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
  }, [refreshAccessToken]);

  const handleDeleteMoodboard = async (event: SyntheticEvent<HTMLDivElement>, moodboardId: number) => {
    event.stopPropagation();

    await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/delete/" + moodboardId,{
      method: "DELETE",
      credentials: "include",
      headers: new Headers({
        "Authorization": "Bearer " + accessToken,
      }),
    });
    window.location.reload();
  }

  const handleAddMoodboard = async (name: string) => {

    const formData = new FormData();

    formData.set("moodboardDto", JSON.stringify({
      moodboardId: -1,
      name: name,
      thumbnail: {},
      data: "",
      ownerId: null
    }))

    await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/add-moodboard",{
      method: "POST",
      credentials: "include",
      body: formData,
      headers: new Headers({
        "Authorization": "Bearer " + accessToken,
      }),
    });

    window.location.reload();
  };

  const handleUploadMoodboard = async (jsonString: string) => {
    // event.preventDefault();
    // const target = event.target as typeof event.target & {
    //   moodboardFile: {value: File};
    // };
    const moodboardObj = JSON.parse(jsonString);
    console.log(moodboardObj);

    if (!("name" in moodboardObj))
      return;

    const formData = new FormData();

    formData.set("moodboardDto", JSON.stringify({
      moodboardId: -1,
      name: moodboardObj.name,
      thumbnail: {},
      data: "",
      ownerId: null
    }))

    await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/add-moodboard",{
      method: "POST",
      credentials: "include",
      body: formData,
      headers: new Headers({
        "Authorization": "Bearer " + accessToken,
      }),
    });
    window.location.reload();
  };

  const handleClearDb = async () => {
    await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/moodboard/delete/all",{
      method: "DELETE",
      credentials: "include",
      headers: new Headers({
        "Authorization": "Bearer " + accessToken,
      }),
    });
    window.location.reload();
  }

  return (
    <div className="flex flex-col w-dvw h-dvh">
      <div className="flex px-4 justify-between items-center bg-gray-50 shadow-md border-b border-gray-300">
        <div className="flex flex-row justify-between gap-4 text-2xl m-4 font-bold h-fit items-center align-middle w-full text-gray-700">
          <div className="flex flex-row gap-4">
            <Image src="/splat-ref-icon.png" className="object-contain" width={36} height={36} alt="Icon of SplatRef"/>
            {isBrowser && <div className="text-2xl font-bold text-gray-700" suppressHydrationWarning>
              SplatRef
            </div>}
            {isBrowser && <div className="text-xl px-4 font-normal text-gray-600" suppressHydrationWarning>
              Online Moodboards
            </div>}
          </div>
          <div className="flex flex-row-reverse gap-4">
            
            <RoundContainer className="m-0 bg-gray-700 text-gray-50 hover:bg-gray-500" hoverable={true}> 
              <Link href="/logout" className="">
                <div className="text-lg px-4 font-normal ">Sign out</div>
              </Link>
            </RoundContainer>
            <RoundContainer className="m-0" hoverable={true}> 
              <Link href="/" className="">
                <div className="text-lg px-4 font-normal text-gray-600">Back to Local</div>
              </Link>
            </RoundContainer>
          </div>
        </div>
      </div>
        <Home
        moodboards={moodboards}
        handleAddMoodboard={handleAddMoodboard}
        handleClearDb={handleClearDb}
        handleDeleteMoodboard={handleDeleteMoodboard}
        handleUploadMoodboard={handleUploadMoodboard}
        baseUrl="/moodboard/online/"
      />
    </div>
  )
}
