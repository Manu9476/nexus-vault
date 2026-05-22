import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your vault structure.</p>
      </div>

      <Card className="border-zinc-800 bg-zinc-950/30">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-100">
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-400">
          Structured uploads can auto-create folders and attach searchable tags for records,
          results, and course notes.
        </CardContent>
      </Card>
    </div>
  );
}
