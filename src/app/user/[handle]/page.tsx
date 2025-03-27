'use client'
import { addMoodboard, clearDb, getAllMoodboards, initDb, MoodboardObject, MoodboardMini, deleteMoodboard } from "@/api/moodboard";
import { SyntheticEvent, useCallback, useEffect, useState } from "react";
import Home from "../../home";
import { useParams } from "next/navigation";

export default function OnlineHome() {
  const [accessToken, setAccessToken] = useState<string>();
  const [moodboards, setMoodboards] = useState<MoodboardMini[]>([]);
  
  const params = useParams<{handle: string}>();

  const refreshAccessToken = useCallback(async () => {
    console.log("test");
      // first init token
    const refreshResponse = await fetch(process.env.NEXT_PUBLIC_BACKEND_HOST + "/api/v1/auth/refresh",{
      method: "POST",
      credentials: "include",
    });

    const refreshJson = await refreshResponse.json();

    // console.log(json);

    if (params.handle !== refreshJson.handle) {
      window.location.assign("/user/" + refreshJson.handle);
    }
    
    const tempAccessToken = refreshJson.accessToken;
    
    setAccessToken(tempAccessToken);

    return tempAccessToken;
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

  return <Home
    moodboards={moodboards}
    handleAddMoodboard={handleAddMoodboard}
    handleClearDb={handleClearDb}
    handleDeleteMoodboard={handleDeleteMoodboard}
    handleUploadMoodboard={handleUploadMoodboard}
    baseUrl="/test"
  />
}
