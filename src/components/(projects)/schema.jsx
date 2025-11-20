"use client";
import { useState, useEffect } from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useParams } from "next/navigation";
import plantumlEncoder from 'plantuml-encoder';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function SchemaPage() {

    const [umlcode, setUmlcode] = useState("");
    const [encoded, setEncoded] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [diagramLoading, setDiagramLoading] = useState(false);
    const [diagramError, setDiagramError] = useState(null);
    const params = useParams();
    const projectid = params.slug;
     useEffect(()=>{
        if(umlcode){
            const encodedUML = plantumlEncoder.encode(umlcode);
            setEncoded(encodedUML);
        }
       },[umlcode])
    
       useEffect(() => {
           if (encoded) {
               const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
               console.log("Generated PlantUML Image URL:", url);
               setImageUrl(url);
               console.log("Image URL set:", url);
           }
       }, [encoded]);
    
        const getdiagram=async () => {
        setDiagramLoading(true);
        setDiagramError(null);
        try {
            const res = await fetch(`/api/projects/${projectid}/diagram`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();
            if (!res.ok) {
                const msg = data?.error || `Failed to fetch diagram (HTTP ${res.status})`;
                setDiagramError(msg);
                return;
            }

            console.log("Diagram got: ", data.plantuml);
            setUmlcode(data.plantuml);
        } catch (err) {
            const msg = err?.message || String(err);
            setDiagramError(msg);
            console.error('Error fetching diagram', err);
        } finally {
            setDiagramLoading(false);
        }
    };
    useEffect(()=>{
    getdiagram();
    },[])
return (
    <div className="w-full h-full p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Database Schema Diagram</h2>
            
                        <div className="border rounded-lg overflow-hidden w-full">
                                <TransformWrapper initialScale={1} minScale={0.5} maxScale={2} centerOnInit={true}
                    wrapperStyle={{
                        width: "100%",
                        height: "100%"
                    }}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            <div className="controls flex gap-2">
                                <button
                                    onClick={() => zoomIn()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer" >
                                    Zoom In (+)
                                </button>
                                <button
                                    onClick={() => zoomOut()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                                >
                                    Zoom Out (-)
                                </button>
                                <button
                                    onClick={() => resetTransform()}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                                >
                                    Reset
                                </button>
                            </div>
                                                        <TransformComponent 
                                                                wrapperStyle={{
                                                                        width: "100%",
                                                                        maxWidth: "100%",
                                                                        height: "100%"
                                                                }}
                                                        >
                                                                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                                    {diagramLoading ? (
                                                                        <div className="w-full px-8 py-12 flex flex-col items-center gap-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="rounded-full p-2" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)' }}>
                                                                                    <DotLottieReact
                                                                                        src="https://lottie.host/bc9b7976-f4d5-43d6-bf35-d97023948cbd/0LrKX98liy.lottie"
                                                                                        loop
                                                                                        autoplay
                                                                                        style={{ width: 56, height: 56 }}
                                                                                    />
                                                                                </div>
                                                                                <div className="text-left">
                                                                                    <div className="text-lg font-semibold">Rendering schema diagram</div>
                                                                                    <div className="text-sm text-gray-500">This may take a few seconds — generating an interactive diagram for your database.</div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="w-full grid grid-cols-2 gap-4 mt-4 max-w-4xl">
                                                                                {[1,2,3,4].map(n => (
                                                                                    <div key={n} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-inner animate-pulse">
                                                                                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                                                                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : diagramError ? (
                                                                        <div className="w-full px-8 py-12 flex flex-col items-center gap-4">
                                                                            <div className="text-red-600 font-medium">Failed to load schema diagram: {diagramError}</div>
                                                                            <div className="text-sm text-gray-500">Try again — if the problem persists, check your database connection.</div>
                                                                            <div className="mt-4">
                                                                                <button onClick={() => getdiagram()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <img 
                                                                            src={imageUrl !== "" ? imageUrl : "/placeholder.png"} 
                                                                            alt="Schema Diagram" 
                                                                            style={{ width: '100%', height: 'auto', maxWidth: '100%' }}
                                                                        />
                                                                    )}
                                                                </div>
                                                        </TransformComponent>
                        </>
                    )}
                </TransformWrapper>
            </div>

            <div className="mt-4 text-sm text-gray-600">
                <p>Tips:</p>
                <ul className="list-disc pl-5">
                    <li>Use mouse wheel or pinch gesture to zoom</li>
                    <li>Click and drag to pan around the diagram</li>
                    <li>Use the controls above to zoom in/out or reset the view</li>
                </ul>
            </div>
        </div>
    </div>
)


}