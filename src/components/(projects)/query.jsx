"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sparkles,Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// MODIFICATION: Accept props
export default function Query({ initialQuery, onQueryMounted }) {
    const params = useParams();
    const projectid = params.slug;
    
    // MODIFICATION: Set initial state from prop
    const [query, setQuery] = useState(initialQuery || "");
    
    const [querysuggestions, setSuggestions] = useState(null);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [suggestionsError, setSuggestionsError] = useState(null);
    const [queryResult, setQueryResult] = useState(null);
    const [loading,setloading]=useState(false);
    const [headers,setheaders]=useState([]);
    const [displayquery,setdisplayquery]=useState(null);

    // MODIFICATION: Add useEffect to handle prop changes
    useEffect(() => {
        // When the component mounts or prop changes with an initialQuery
        if (initialQuery) {
            setQuery(initialQuery);
            // Notify the parent component that the query has been "consumed"
            if (onQueryMounted) {
                onQueryMounted();
            }
        }
    }, [initialQuery, onQueryMounted]); // Rerun when prop changes

    const getSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const response = await fetch(`/api/ai/query-suggestions/${projectid}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} - ${text}`);
      }
      const suggestions = await response.json();
      setSuggestions(suggestions.suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestionsError(error.message || String(error));
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
    }
  useEffect(()=>{
    getSuggestions();
  },[projectid]) // Added projectid dependency
    const runquery=async()=>{
      if(query.trim()===""){
        alert("enter a valid query");
        return;
      }
      setloading(true);
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
        setdisplayquery(query);
        setQuery("");
      }catch(error){
        console.error("Error executing query:", error);
      }finally{
        setloading(false);
      }
    }

    useEffect(()=>{
      if(!queryResult || queryResult.length === 0) return;
      const headers=Object.keys(queryResult[0]);
      setheaders(headers);
    },[queryResult])
    return (<>
  { suggestionsLoading ? (
    <div className="mx-10 mt-[25px]" aria-busy="true" aria-live="polite">
      <div 
        className="chat-input-area rounded-xl px-8 py-8 flex flex-col gap-4"
        style={{
          background: "var(--panel-bg)",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--border)"
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-medium" style={{ color: "var(--text)" }}>Generating suggestions</div>
          <div className="flex items-center gap-2">
            <DotLottieReact
              src="https://lottie.host/bc9b7976-f4d5-43d6-bf35-d97023948cbd/0LrKX98liy.lottie"
              loop
              autoplay
              style={{ width: 36, height: 36 }}
            />
            <span className="text-sm" style={{ color: "var(--muted-text)" }}>Hang tight — getting ideas for you</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {[1,2,3,4].map(n => (
            <div 
              key={n} 
              className="animate-pulse rounded-md h-10 w-1/3 max-w-[240px]"
              style={{ background: "var(--accent)" }}
            />
          ))}
        </div>
      </div>
    </div>
  ) : querysuggestions? <div className="flex flex-col h-full mt-[25px]">
                      <div 
                        className={`chat-input-area rounded-xl px-8 py-10 mx-10 flex flex-col gap-30 ${loading ? 'loading' : ''}`}
                        style={{
                          background: "var(--panel-bg)",
                          boxShadow: "var(--shadow)",
                          border: "1px solid var(--border)"
                        }}
                      >
                        <div className="query_head flex flex-col gap-3">
                        <p style={{ color: "var(--text)" }}>Ask Your Database</p>
                            <textarea 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Ask your database in plain English... e.g., 'Show all employees in HR department'"
                            className="min-h-[48px] max-h-[200px] overflow-auto resize-none"
                            rows={2}
                            style={{ 
                              transition: "height 0.2s",
                              color: "var(--text)",
                              background: "var(--panel-bg)",
                              borderColor: "var(--border)"
                            }}
                          />
                        
                        </div>
                        
                        <div className="flex justify-between ">
                        <div className="flex flex-wrap gap-3 mb-6 w-4/5">
                          { querysuggestions? querysuggestions.map((ex) => (
                            <button
                              key={ex}
                              type="button"
                              className="flex items-center gap-2 border-1 hover:cursor-pointer text-sm font-medium px-4 py-2 rounded-md shadow-sm"
                              onClick={() => setQuery(ex)}
                              style={{
                                background: "var(--accent)",
                                borderColor: "var(--border)",
                                color: "var(--text)"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "var(--primary)";
                                e.currentTarget.style.color = "var(--primary-contrast)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "var(--accent)";
                                e.currentTarget.style.color = "var(--text)";
                              }}
                            >
                                <Sparkles className="w-4 h-4" style={{ color: "var(--muted-text)" }} />
                              {ex}
                            </button>
                          )): null }
                        </div>
                        <div className="runbtn flex flex-col justify-end">
                         <Button className=" max-[510]:w-full hover:cursor-pointer" onClick={()=>{
                          runquery();
                         }} disabled={loading}>
                           { loading? <DotLottieReact
      src="https://lottie.host/bc9b7976-f4d5-43d6-bf35-d97023948cbd/0LrKX98liy.lottie"
      loop
      autoplay
    />:<Send className="w-5 h-5 text-white"  />}
                            {loading ? 'Running...' : 'Run Query'}
                         </Button>
                        </div>
                        
                        </div>
                      </div>
                      {
                        !queryResult ? <div className="text-center mt-16" style={{ color: "var(--muted-text)" }}>
                       
                        <div className="text-lg font-medium flex justify-center items-center flex-col">
                             <Sparkles className="w-10 h-10" style={{ color: "var(--muted-text)" }} />
                          Ask anything about your data<br />
                          <span className="text-base" style={{ color: "var(--muted-text)" }}>
                            Use natural language to query your database. No SQL knowledge required.
                          </span>
                        </div>
                      </div> : 
                      <>
                        <div className="mx-10 mt-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5" style={{ color: "var(--primary)" }} />
                            <h3 className="font-medium" style={{ color: "var(--text)" }}>Your Query:</h3>
                          </div>
                          <p className="pl-7" style={{ color: "var(--muted-text)" }}>{displayquery}</p>
                        </div>
                        <hr style={{ borderColor: "var(--border)" }} />
                       <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-full" style={{ background: "var(--panel-bg)", borderRadius: "8px" }}>

                                <table className="min-w-max w-full table-auto">
                                    <thead>
                                        <tr style={{ background: "var(--accent)", borderColor: "var(--border)" }}>
                                  
                                            {headers.length!==0 && headers.map((colname) => (
                                                <th 
                                                  key={colname} 
                                                  className="px-4 py-2 border-b whitespace-nowrap"
                                                  style={{ 
                                                    color: "var(--text)",
                                                    borderColor: "var(--border)"
                                                  }}
                                                >
                                                    {colname}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queryResult.length > 0 ?
                                            (
                                                queryResult.map((row, i) => (
                                                    <tr key={i} style={{ borderColor: "var(--border)" }}>
                                                  
                                                        {
                                                            headers.length!==0 && headers.map((col) => (
                                                                <td
                                                                    key={col}
                                                                    className="px-4 py-2 text-center whitespace-nowrap cursor-pointer"
                                                                    style={{
                                                                      color: "var(--text)",
                                                                      borderColor: "var(--border)"
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                      e.currentTarget.style.background = "var(--accent)";
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                      e.currentTarget.style.background = "transparent";
                                                                    }}
                                                                >
                                                                {row[col]}
                                                                </td>
                                                            ))}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={headers.length || 1}
                                                        className="text-center py-4"
                                                        style={{ color: "var(--muted-text)" }}
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
                    </div> : suggestionsError ? (
                      <div className="mx-10 mt-[16px] text-center">
                        <div className="text-red-500 mb-2">Failed to load suggestions: {suggestionsError}</div>
                        <div className="flex justify-center">
                          <Button onClick={() => getSuggestions()}>Retry</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-10 mt-[16px] text-center" style={{ color: "var(--muted-text)" }}>Loading suggestions...</div>
                    )}
    </>
   
);

}