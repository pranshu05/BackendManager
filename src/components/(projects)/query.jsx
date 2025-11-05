"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sparkles,Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Query() {
    const params = useParams();
    const projectid = params.slug;
    const [query, setQuery] = useState("");
    const [querysuggestions, setSuggestions] = useState(null);
    const getSuggestions = async () => {
        try {
            const response = await fetch(`/api/ai/query-suggestions/${projectid}`);
            const suggestions = await response.json();
            console.log("Suggestions:", suggestions);
            setSuggestions(suggestions.suggestions);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    }
    useEffect(()=>{
        getSuggestions();
    },[])

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
                         <Button className=" max-[510]:w-full hover:cursor-pointer">
                            <Send className="w-5 h-5 text-white"  />
                            Run Query
                         </Button>
                        </div>
                        
                        </div>
                      </div>
                      <div className="text-center mt-16 text-gray-500">
                       
                        <div className="text-lg font-medium flex justify-center items-center flex-col">
                             <Sparkles  className="w-10 h-10 text-gray-500"/>
                          Ask anything about your data<br />
                          <span className="text-base text-gray-400">
                            Use natural language to query your database. No SQL knowledge required.
                          </span>
                        </div>
                      </div>
                    </div>: <div>Loading suggestions...</div>}
    </>
   
);

}