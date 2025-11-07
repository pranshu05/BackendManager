"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sparkles,Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function Query() {
    const params = useParams();
    const projectid = params.slug;
    const [query, setQuery] = useState("");
    const [querysuggestions, setSuggestions] = useState(null);
    const [queryResult, setQueryResult] = useState(null);
    const [loading,setloading]=useState(false);
    const [headers,setheaders]=useState([]);
    const [displayquery,setdisplayquery]=useState(null);
    const getSuggestions = async () => {
        try {
            const response = await fetch(`/api/ai/query-suggestions/${projectid}`);
            const suggestions = await response.json();
            setSuggestions(suggestions.suggestions);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    }
    useEffect(()=>{
        getSuggestions();
    },[])
    const runquery=async()=>{
      if(query.trim()===""){
        alert("enter a valid query");
        return;
      }
      try{
        const analysisResponse = await fetch(`/api/ai/update-project/${projectid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ naturalLanguageInput: query }),
        });
   
        const analysisData = await analysisResponse.json();

        const operations= analysisData.updateAnalysis.operations || [];
     
        const naturalLanguageInput=query;
        const result=await fetch(`/api/ai/execute-batch/${projectid}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ operations, naturalLanguageInput }),
        });
        const resultData = await result.json();
        
        setQueryResult(resultData.results[0].queryResult);
      }catch(error){
        console.error("Error executing query:", error);
      }
      setloading(false);
      setdisplayquery(query);
      setQuery("");
    }

    useEffect(()=>{
      if(!queryResult || queryResult.length === 0) return;
      const headers=Object.keys(queryResult[0]);
      setheaders(headers);
    },[queryResult])
    return (<>
     { querysuggestions? <div className="flex flex-col h-full my-20">
                      <div className="bg-white rounded-xl shadow-lg px-8 py-10 mx-10 flex flex-col gap-30">
                        <div className="query_head flex flex-col gap-3">
                        <p>Ask Your Database</p>
                            <textarea 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Ask your database in plain English... e.g., 'Show all employees in HR department'"
                            className=" min-h-[48px] max-h-[200px] overflow-auto resize-none text-gray-800"
                            rows={2}
                            style={{ transition: "height 0.2s" }}
                          />
                        
                        </div>
                        
                        <div className="flex justify-between ">
                        <div className="flex flex-wrap gap-3 mb-6 w-4/5">
                          { querysuggestions? querysuggestions.map((ex) => (
                            <button
                              key={ex}
                              type="button"
                              className="flex items-center gap-2 bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer text-gray-800 text-sm font-medium px-4 py-2 rounded-md border-gray-200 shadow-sm"
                              onClick={() => setQuery(ex)}
                            >
                                <Sparkles  className="w-4 h-4 text-gray-500"/>
                              {ex}
                            </button>
                          )): null }
                        </div>
                        <div className="runbtn flex flex-col justify-end">
                         <Button className=" max-[510]:w-full hover:cursor-pointer" onClick={()=>{
                          setloading(true)
                          runquery();
                         }} >
                           { loading? <DotLottieReact
      src="https://lottie.host/bc9b7976-f4d5-43d6-bf35-d97023948cbd/0LrKX98liy.lottie"
      loop
      autoplay
    />:<Send className="w-5 h-5 text-white"  />}
                            Run Query
                         </Button>
                        </div>
                        
                        </div>
                      </div>
                      {
                        !queryResult ? <div className="text-center mt-16 text-gray-500">
                       
                        <div className="text-lg font-medium flex justify-center items-center flex-col">
                             <Sparkles  className="w-10 h-10 text-gray-500"/>
                          Ask anything about your data<br />
                          <span className="text-base text-gray-400">
                            Use natural language to query your database. No SQL knowledge required.
                          </span>
                        </div>
                      </div> : 
                      <>
                        <div className="mx-10 mt-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-blue-500"/>
                            <h3 className="font-medium text-gray-700">Your Query:</h3>
                          </div>
                          <p className="text-gray-600 pl-7">{displayquery}</p>
                        </div>
                        <hr />
                       <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-full">

                                <table className="min-w-max w-full table-auto">
                                    <thead className="tb_head">
                                        <tr>
                                  
                                            {headers.length!==0 && headers.map((colname) => (
                                                <th key={colname} className="px-4 py-2 border-b whitespace-nowrap">
                                                    {colname}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queryResult.length > 0 ?
                                            (
                                                queryResult.map((row, i) => (
                                                    <tr key={i} className="border-b">
                                                  
                                                        {
                                                            headers.length!==0 && headers.map((col) => (
                                                                <td
                                                                    key={col.name}
                                                                    className={`px-4 py-2 text-center whitespace-nowrap hover:bg-sidebar hover:border-1 cursor-pointer 
                                                                    `}
                                                          
                                                                >
                                                                {row[col]}
                                                                </td>
                                                            ))}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={headers.length}
                                                        className="text-center py-4 text-gray-500"
                                                    >
                                                        No records found
                                                    </td>
                                                </tr>
                                            )}

                                    </tbody>
                                </table>
                              

                            </div>
                        
                      </>

                      }
                    </div>: 
                    <div>Loading suggestions...</div>}
    </>
   
);

}