"use client";

import Link from "next/link";
import { BadgeCheck, FileBadge, GraduationCap, NotebookTabs } from "lucide-react";

import { FileUpload } from "@/components/FileUpload";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Identity",
    icon: BadgeCheck,
    href: "/files?q=personal-record",
    items: ["Birth Certificate", "National ID", "Driving License"],
  },
  {
    title: "Certificates",
    icon: FileBadge,
    href: "/files?q=certificate",
    items: ["KCSE Certificate", "Other Certificates", "Official Letters"],
  },
  {
    title: "Results",
    icon: GraduationCap,
    href: "/files?q=results",
    items: ["Year 1", "Year 2", "Year 3", "Year 4"],
  },
  {
    title: "Course Notes",
    icon: NotebookTabs,
    href: "/files?q=notes",
    items: ["Course Code", "Year", "Semester"],
  },
] as const;

const quickSearches = [
  { label: "Birth Cert", href: "/files?q=birth-certificate" },
  { label: "KCSE", href: "/files?q=kcse-certificate" },
  { label: "Driving License", href: "/files?q=driving-license" },
  { label: "Year 1 Results", href: "/files?q=year:1 results" },
  { label: "Year 2 Notes", href: "/files?q=year:2 notes" },
  { label: "Semester 1", href: "/files?q=semester:1" },
] as const;

export default function OrganizerPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Organizer</h1>
          <p className="mt-1 text-sm text-nexus-muted">
            Structured intake for personal records and academic files.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickSearches.map((item) => (
            <Link key={item.href} href={item.href}>
              <Badge className="transition-colors hover:border-nexus-orange/70 hover:text-nexus-orange">
                {item.label}
              </Badge>
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.title} href={section.href}>
              <Card className="h-full transition-colors hover:border-nexus-orange">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexus-surface text-nexus-purple">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {section.items.map((item) => (
                      <span
                        key={item}
                        className="rounded border border-nexus-border bg-nexus-surface px-2 py-1 text-[11px] text-nexus-muted"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <FileUpload />
    </div>
  );
}
