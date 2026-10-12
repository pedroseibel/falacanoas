import type { Item, Municipality } from "@fala/core";
import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Choropleth, DaysMeter, StatTile } from "@/components/viz";
import {
  overDeadlineByBairro,
  placarKpis,
  placarRows,
  PlacarViewSchema,
  weeklyNew,
  type PlacarRow,
  type PlacarView,
} from "./placar-model";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});
const helper = createColumnHelper<typeof features, PlacarRow>();

const VIEW_LABEL: Record<PlacarView, string> = { tipo: "Por tipo", orgao: "Por órgão", bairro: "Por bairro" };
const FIRST_COLUMN: Record<PlacarView, string> = { tipo: "Tipo", orgao: "Órgão responsável", bairro: "Bairro" };

export function PlacarPage({
  items,
  muni,
  view,
  onView,
  onBairro,
}: {
  items: Item[];
  muni: Municipality;
  view: PlacarView;
  onView: (v: PlacarView) => void;
  onBairro: (slug: string) => void;
}) {
  const deadline = muni.deadlineDays;
  const rows = useMemo(() => placarRows(items, muni, view), [items, muni, view]);
  const kpi = useMemo(() => placarKpis(items, deadline), [items, deadline]);
  const choro = useMemo(() => overDeadlineByBairro(items, deadline), [items, deadline]);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: FIRST_COLUMN[view],
          sortFn: "alphanumeric",
          cell: (c) => {
            const slug = c.row.original.bairro;
            return slug ? (
              <button
                type="button"
                onClick={() => onBairro(slug)}
                className="font-medium underline-offset-4 hover:underline"
              >
                {c.getValue()}
              </button>
            ) : (
              c.getValue()
            );
          },
        }),
        helper.accessor("medianToFix", {
          id: "meter",
          header: "Mediana até o conserto",
          enableSorting: false,
          cell: (c) => {
            const v = c.getValue();
            return v === null ? (
              <span className="text-xs text-muted-foreground">poucos dados</span>
            ) : (
              <DaysMeter days={v} deadline={deadline} />
            );
          },
        }),
        helper.accessor((r) => r.medianToFix ?? -1, {
          id: "median",
          header: "Dias",
          sortFn: "basic",
          cell: (c) => c.row.original.medianToFix ?? "—",
        }),
        helper.accessor("open", { header: "Abertos", sortFn: "basic" }),
        helper.accessor("fixedWithinDeadlinePct", {
          header: `Em ${deadline} dias`,
          sortFn: "basic",
          cell: (c) => `${c.getValue()}%`,
        }),
      ]),
    [view, deadline, onBairro],
  );
  const table = useTable({ features, columns, data: rows, initialState: { sorting: [{ id: "median", desc: true }] } });

  const weekly = useMemo(() => weeklyNew(items), [items]);
  const chart = useMemo(
    () =>
      defineChart({
        marks: [barY(weekly, { x: "week", y: "count", radius: [4, 4, 0, 0], maxThickness: 24 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(weekly.map((w) => w.week))
                .padding(0.3),
            axis: { label: "semanas atrás" },
          },
          y: { scale: scaleLinear, nice: true, grid: true, axis: { label: "registros" } },
        },
        tooltip,
      }),
    [weekly],
  );

  return (
    <div className="mx-auto grid max-w-295 gap-6 px-7 pt-8 pb-16 max-[900px]:px-4 max-[900px]:pt-5 max-[900px]:pb-24">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Placar</h1>
          <p className="mt-1.5 max-w-150 text-sm text-muted-foreground">
            Mediana de dias entre o envio à Prefeitura e o conserto confirmado pelos vizinhos. Protótipo: os números vêm
            dos dados fictícios do mapa.
          </p>
        </div>
      </header>

      <section
        className="grid grid-cols-4 divide-x divide-hairline overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft max-[900px]:grid-cols-2"
        aria-label="Resumo"
      >
        <StatTile value={kpi.open} label="abertos" />
        <StatTile value={kpi.overDeadline} label={`abertos há mais de ${deadline} dias`} attention />
        <StatTile value={kpi.medianToFix} label="mediana até o conserto (dias)" />
        <StatTile value={kpi.fixed} label="resolvidos e confirmados" />
      </section>

      <div className="grid grid-cols-12 items-start gap-5 max-[1100px]:grid-cols-1">
        <section
          className="col-span-7 overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft max-[1100px]:col-span-1"
          aria-label="Leituras do placar"
        >
          <div className="border-b border-hairline p-2.5">
            <Tabs
              value={view}
              onValueChange={(v) => {
                const parsed = PlacarViewSchema.safeParse(v);
                if (parsed.success) onView(parsed.data);
              }}
            >
              <TabsList>
                {PlacarViewSchema.options.map((v) => (
                  <TabsTrigger key={v} value={v}>
                    {VIEW_LABEL[v]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    const numeric = h.column.id !== "name" && h.column.id !== "meter";
                    return (
                      <TableHead
                        key={h.id}
                        className={numeric ? "text-right" : undefined}
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      >
                        {h.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={h.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <table.FlexRender header={h} />
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3" />
                            ) : null}
                          </button>
                        ) : (
                          <table.FlexRender header={h} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.original.bairro ? "cursor-pointer" : undefined}
                  onClick={(e) => {
                    // The name cell's button already handles its own click (and the keyboard).
                    if (e.target instanceof Element && e.target.closest("button")) return;
                    if (row.original.bairro) onBairro(row.original.bairro);
                  }}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "name" ? undefined : cell.column.id === "meter" ? "min-w-36" : "text-right"
                      }
                    >
                      <span
                        className={
                          cell.column.id === "name"
                            ? "font-medium"
                            : cell.column.id === "meter"
                              ? undefined
                              : "tabular-nums"
                        }
                      >
                        <table.FlexRender cell={cell} />
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t border-hairline px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            A marca de {deadline} dias é referência: o prazo que a lei dá para responder uma manifestação, prorrogável
            por mais {deadline}. Laranja: a parte acima dele.
          </p>
        </section>

        <div className="col-span-5 grid gap-5 max-[1100px]:col-span-1">
          <section
            className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft"
            aria-labelledby="choro-t"
          >
            <h2 id="choro-t" className="border-b border-hairline px-4 py-3 text-sm font-semibold">
              Abertos há mais de {deadline} dias <span className="font-normal text-muted-foreground">por bairro</span>
            </h2>
            <Choropleth
              geo={muni.geo.neighborhoods}
              values={choro}
              unit={`abertos há +${deadline} dias`}
              label="Bairros de Canoas: mais escuro, mais registros abertos há mais de 30 dias. A tabela Por bairro tem os mesmos números."
              onPick={onBairro}
            />
          </section>
          <section
            className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-soft"
            aria-labelledby="week-t"
          >
            <h2 id="week-t" className="border-b border-hairline px-4 py-3 text-sm font-semibold">
              Novos registros por semana <span className="font-normal text-muted-foreground">últimas 12</span>
            </h2>
            <div className="chart-ink px-2 pt-2 pb-3">
              <Chart definition={chart} height={220} ariaLabel="Novos registros por semana nas últimas 12 semanas" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
