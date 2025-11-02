"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImportDatabase({ onImported }) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ host: "", port: 5432, username: "", password: "", database: "", projectName: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Import failed');
            } else {
                setOpen(false);
                setForm({ host: "", port: 5432, username: "", password: "", database: "", projectName: "" });
                if (onImported) onImported(data.project);
            }
        } catch (err) {
            setError(err.message || 'Import error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm">Import Database</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Existing Database</DialogTitle>
                    <DialogDescription>
                        Connect an existing PostgreSQL/Neon database to DBuddy. Credentials are stored in your account.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm text-foreground block mb-1">Host</label>
                        <Input name="host" value={form.host} onChange={handleChange} required />
                    </div>

                    <div>
                        <label className="text-sm text-foreground block mb-1">Port</label>
                        <Input name="port" value={form.port} onChange={handleChange} required />
                    </div>

                    <div>
                        <label className="text-sm text-foreground block mb-1">Username</label>
                        <Input name="username" value={form.username} onChange={handleChange} required />
                    </div>

                    <div>
                        <label className="text-sm text-foreground block mb-1">Password</label>
                        <Input name="password" type="password" value={form.password} onChange={handleChange} />
                    </div>

                    <div>
                        <label className="text-sm text-foreground block mb-1">Database</label>
                        <Input name="database" value={form.database} onChange={handleChange} required />
                    </div>

                    <div>
                        <label className="text-sm text-foreground block mb-1">Project Name (optional)</label>
                        <Input name="projectName" value={form.projectName} onChange={handleChange} />
                    </div>

                    {error && <div className="text-sm text-red-600">{error}</div>}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost" type="button">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={loading}>{loading ? 'Importing...' : 'Import'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default ImportDatabase;
