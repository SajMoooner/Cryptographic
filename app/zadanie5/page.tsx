"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PageShell from "../components/page-shell";

type ApiCracked = {
  login: string;
  salt: string;
  hash: string;
  password: string;
  category: string;
  attempts: number;
};

type ApiStats = {
  hashed: number;
  triedNames: number;
  triedCustom: number;
  triedLogin: number;
  triedLower6: number;
  triedLower7: number;
  triedMixed4: number;
  triedMixed5: number;
  durationMs: number;
  timedOut: boolean;
  workersUsed: number;
};

type ApiResult = {
  ok: boolean;
  cracked: ApiCracked[];
  remaining: { login: string; salt: string; hash: string }[];
  stats: ApiStats;
  total: number;
};

const baseCardSx = {
  borderRadius: 4,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 24px 48px -32px rgba(15, 23, 42, 0.85)",
};

const cardSx = {
  ...baseCardSx,
  p: { xs: 3, md: 3.5 },
  color: "#ffffff",
};

const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#ffffff",
    "& fieldset": {
      borderColor: "rgba(148, 163, 184, 0.35)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(129, 140, 248, 0.6)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "rgba(129, 140, 248, 0.9)",
    },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.72)",
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#ffffff",
  },
};

const outlineButtonSx = {
  borderColor: "rgba(148, 163, 184, 0.35)",
  color: "#ffffff",
  "&:hover": {
    borderColor: "rgba(129, 140, 248, 0.7)",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
};

const SAMPLE_SHADOW = `styrak:3IdNfDGs:yPMriIe93sIC07Zl2JHcmw==
kanik:RHAsLsEI:O+TQMklUtp5yde4AATTJnA==
svrcek14:VbuOMGDP:HZapbEKIaqjlDq5DNcnFCQ==
paluch:iAv0k5l5:Xe08WId86QGv3KzaW09VMg==
ondrisek:33MBDW1C:xSJw1uXDpOW5Csc1TlwMaw==
poliakov:haZoUH5y:V/EzXQeKK465HYzKkuxooQ==`;

const DEFAULT_NAMES = `zuzana
zuzka
martin
marek
matus
peter
pavol
jano
katarina
lucia
juraj
maria
veronika
tatiana
filip
anna`;

const DEFAULT_EXTRA = `heslo
password
tajne
abcdef
letmein
qwerty
login
slovensko`;

function parseList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function Zadanie5Page() {
  const [shadow, setShadow] = React.useState<string>(SAMPLE_SHADOW);
  const [names, setNames] = React.useState<string>(DEFAULT_NAMES);
  const [extraWords, setExtraWords] = React.useState<string>(DEFAULT_EXTRA);

  // Kategória 1: Slovenské mená
  const [enableNames, setEnableNames] = React.useState<boolean>(true);
  const [useDefaultNames, setUseDefaultNames] = React.useState<boolean>(true);
  const [deriveFromLogin, setDeriveFromLogin] = React.useState<boolean>(true);

  // Kategória 2: 6-7 malých písmen
  const [enableLower6, setEnableLower6] = React.useState<boolean>(true);
  const [enableLower7, setEnableLower7] = React.useState<boolean>(true);
  const [maxLower, setMaxLower] = React.useState<number>(500000);

  // Kategória 3: 4-5 mixed znakov
  const [enableMixed4, setEnableMixed4] = React.useState<boolean>(true);
  const [enableMixed5, setEnableMixed5] = React.useState<boolean>(true);
  const [maxMixed, setMaxMixed] = React.useState<number>(500000);

  const [timeLimit, setTimeLimit] = React.useState<number>(60000);
  const [numWorkers, setNumWorkers] = React.useState<number>(4);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ApiResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setShadow(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/shadow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shadow,
          customNames: parseList(names),
          extraWords: parseList(extraWords),
          enableNames,
          includeDefaultNames: useDefaultNames,
          deriveFromLogins: deriveFromLogin,
          enableLower6,
          enableLower7,
          enableMixed4,
          enableMixed5,
          maxLowerCandidates: maxLower,
          maxMixedCandidates: maxMixed,
          timeLimitMs: timeLimit,
          numWorkers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nepodarilo sa cracknúť heslá.");
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Neznáma chyba.");
    } finally {
      setLoading(false);
    }
  };

  const statsChips = result ? [
    { label: `Skúsených hashov: ${result.stats.hashed.toLocaleString("sk-SK")}`, color: "primary" as const },
    { label: `Nájdených: ${result.cracked.length}/${result.total}`, color: "success" as const },
    { label: `Čas: ${(result.stats.durationMs / 1000).toFixed(2)} s`, color: "secondary" as const },
    { label: `Workerov: ${result.stats.workersUsed}`, color: "info" as const },
  ] : [];

  const limiterHint = result && result.stats.timedOut;

  const categoryStatus = result ? [
    {
      title: "Kat. 1 (mená)",
      detail:
        result.stats.triedNames + result.stats.triedCustom + result.stats.triedLogin > 0
          ? `Mena: ${result.stats.triedNames.toLocaleString("sk-SK")}, extra: ${result.stats.triedCustom.toLocaleString("sk-SK")}, login: ${result.stats.triedLogin.toLocaleString("sk-SK")}`
          : "Vypnuté alebo nebolo spustené",
    },
    {
      title: "Kat. 2 (a-z 6/7)",
      detail:
        result.stats.triedLower6 + result.stats.triedLower7 > 0
          ? `6: ${result.stats.triedLower6.toLocaleString("sk-SK")} | 7: ${result.stats.triedLower7.toLocaleString("sk-SK")}`
          : "Vypnuté alebo nebolo spustené",
    },
    {
      title: "Kat. 3 (a-zA-Z0-9 4/5)",
      detail:
        result.stats.triedMixed4 + result.stats.triedMixed5 > 0
          ? `4: ${result.stats.triedMixed4.toLocaleString("sk-SK")} | 5: ${result.stats.triedMixed5.toLocaleString("sk-SK")}`
          : "Vypnuté alebo nebolo spustené",
    },
  ] : [];

  return (
    <PageShell
      title="Zadanie 5 - Lámanie hesiel zo shadow súborov"
      subtitle="MD5 + Base64 s individuálnou soľou, slovníkový útok na slovenské mená a obmedzený brute-force pre krátke heslá."
      maxWidth="lg"
    >
      <Stack spacing={{ xs: 3.5, md: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Button
            variant="outlined"
            onClick={() => setShadow(SAMPLE_SHADOW)}
            sx={outlineButtonSx}
            disabled={loading}
          >
            Nahrať ukážku shadow1
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={onPickFile}
            sx={outlineButtonSx}
            disabled={loading}
          >
            Otvoriť .txt
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: "none" }}
            onChange={onFileChange}
          />
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={loading}
            sx={{ px: 3 }}
          >
            {loading ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} />
                Crackujem...
              </>
            ) : (
              "Spustiť cracking"
            )}
          </Button>
        </Stack>

        <Alert
          severity="info"
          sx={{
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            color: "#e2e8f0",
            borderColor: "rgba(59, 130, 246, 0.35)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#ffffff", mb: 0.5 }}>
            Stratégia podľa kategórií (nemiešam pravidlá):
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Kat. 1: slovník slovenských mien + zdrobnenín s max. 1 veľkým písmenom, doplnené o login a vlastný
            zoznam.
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Kat. 2: iteratívny brute-force 6/7 písmen (a-z) rozdelený cez worker pool (npm <code>workerpool</code>) podľa
            počtu workerov.
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Kat. 3: bruteforce 4/5 znakov (a-zA-Z0-9) – vhodné pre kratšie "w7H5" heslá, limit nastav podľa času.
          </Typography>
        </Alert>

        <Paper variant="outlined" sx={cardSx}>
          <Stack spacing={3}>
            <TextField
              label="Shadow (login:soľ:hash)"
              value={shadow}
              onChange={(e) => setShadow(e.target.value)}
              multiline
              minRows={8}
              fullWidth
              sx={textFieldSx}
              placeholder="login:sol:b64(md5(pass+sol))"
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Slovenské mená / prezývky (jeden na riadok)"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                multiline
                minRows={5}
                sx={{ width: { xs: "100%", md: "50%" }, ...textFieldSx }}
              />
              <TextField
                label="Extra slovník (slová, obľúbené heslá)"
                value={extraWords}
                onChange={(e) => setExtraWords(e.target.value)}
                multiline
                minRows={5}
                sx={{ width: { xs: "100%", md: "50%" }, ...textFieldSx }}
                helperText="Použije sa pred brute-force."
              />
            </Stack>

            {/* KATEGÓRIA 1: Slovenské mená */}
            <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.24)" }}>
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                Kategória 1: Slovenské mená
              </Typography>
            </Divider>

            <FormControlLabel
              control={
                <Switch
                  checked={enableNames}
                  onChange={(_, v) => setEnableNames(v)}
                  color="primary"
                />
              }
              label="Povoliť lámanie slovenských mien a zdrobnenín"
              sx={{ color: enableNames ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)" }}
            />

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
              sx={{ pl: 4, opacity: enableNames ? 1 : 0.4 }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={useDefaultNames}
                    onChange={(_, v) => setUseDefaultNames(v)}
                    color="primary"
                    disabled={!enableNames}
                  />
                }
                label="Pridať vstavaný kalendár mien (s max. 1 veľkým písmenom)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={deriveFromLogin}
                    onChange={(_, v) => setDeriveFromLogin(v)}
                    color="primary"
                    disabled={!enableNames}
                  />
                }
                label="Použiť login a login bez číslic ako kandidát"
              />
            </Stack>

            {/* KATEGÓRIA 2: 6-7 malých písmen */}
            <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.24)" }}>
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                Kategória 2: 6-7 malých písmen (a-z)
              </Typography>
            </Divider>

            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableLower6}
                      onChange={(_, v) => setEnableLower6(v)}
                      color="primary"
                    />
                  }
                  label="Brute-force 6 písmen (a-z)"
                  sx={{ minWidth: 220 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableLower7}
                      onChange={(_, v) => setEnableLower7(v)}
                      color="primary"
                    />
                  }
                  label="Brute-force 7 písmen (a-z)"
                  sx={{ minWidth: 220 }}
                />
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ pl: { xs: 0, md: 4 } }}>
                <TextField
                  type="number"
                  label="Max. kandidátov (na dĺžku)"
                  value={maxLower}
                  onChange={(e) => setMaxLower(Number(e.target.value))}
                  sx={{ width: 240, ...textFieldSx }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">≤</InputAdornment>,
                  }}
                  disabled={!enableLower6 && !enableLower7}
                />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  26^6 ≈ 309M, 26^7 ≈ 8B kombinácií
                </Typography>
              </Stack>
            </Stack>

            {/* KATEGÓRIA 3: 4-5 mixed znakov */}
            <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.24)" }}>
              <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                Kategória 3: 4-5 znakov (a-zA-Z0-9)
              </Typography>
            </Divider>

            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableMixed4}
                      onChange={(_, v) => setEnableMixed4(v)}
                      color="primary"
                    />
                  }
                  label="Brute-force 4 znaky (a-zA-Z0-9)"
                  sx={{ minWidth: 240 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableMixed5}
                      onChange={(_, v) => setEnableMixed5(v)}
                      color="primary"
                    />
                  }
                  label="Brute-force 5 znakov (a-zA-Z0-9)"
                  sx={{ minWidth: 240 }}
                />
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ pl: { xs: 0, md: 4 } }}>
                <TextField
                  type="number"
                  label="Max. kandidátov (na dĺžku)"
                  value={maxMixed}
                  onChange={(e) => setMaxMixed(Number(e.target.value))}
                  sx={{ width: 240, ...textFieldSx }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">≤</InputAdornment>,
                  }}
                  disabled={!enableMixed4 && !enableMixed5}
                />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  62^4 ≈ 14.7M, 62^5 ≈ 916M kombinácií
                </Typography>
              </Stack>
            </Stack>

            <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.24)" }} />

            {/* Všeobecné nastavenia */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <TextField
                type="number"
                label="Časový limit (ms)"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                sx={{ width: 180, ...textFieldSx }}
              />
              <TextField
                type="number"
                label="Počet workerov"
                value={numWorkers}
                onChange={(e) => setNumWorkers(Number(e.target.value))}
                sx={{ width: 180, ...textFieldSx }}
                inputProps={{ min: 1, max: 16 }}
              />
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.74)" }}>
                Paralelný výpočet pomocou Worker threads zrýchli brute-force.
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        )}

        {result && (
          <Paper variant="outlined" sx={cardSx}>
            <Stack spacing={2.4}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {statsChips.map((chip) => (
                  <Chip key={chip.label} label={chip.label} color={chip.color} sx={{ color: "#fff" }} />
                ))}
                {result.stats.timedOut && (
                  <Chip label="Stop: časový limit" color="warning" sx={{ color: "#0f172a" }} />
                )}
              </Stack>

              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  <strong>Kat. 1 (Mená):</strong> {result.stats.triedNames.toLocaleString("sk-SK")} mien, {result.stats.triedCustom.toLocaleString("sk-SK")} custom, {result.stats.triedLogin.toLocaleString("sk-SK")} loginov
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  <strong>Kat. 2 (a-z):</strong> 6 písmen: {result.stats.triedLower6.toLocaleString("sk-SK")}, 7 písmen: {result.stats.triedLower7.toLocaleString("sk-SK")}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                  <strong>Kat. 3 (a-zA-Z0-9):</strong> 4 znaky: {result.stats.triedMixed4.toLocaleString("sk-SK")}, 5 znakov: {result.stats.triedMixed5.toLocaleString("sk-SK")}
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                sx={{ flexWrap: "wrap", gap: 1 }}
              >
                {categoryStatus.map((item) => (
                  <Paper
                    key={item.title}
                    variant="outlined"
                    sx={{
                      ...baseCardSx,
                      borderColor: "rgba(148, 163, 184, 0.28)",
                      px: 2,
                      py: 1.2,
                      minWidth: { xs: "100%", md: 280 },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: "#e2e8f0", fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.82)" }}>
                      {item.detail}
                      {result.stats.timedOut && " (stop: časový limit)"}
                    </Typography>
                  </Paper>
                ))}
              </Stack>

              {limiterHint && (
                <Alert severity="info" sx={{ backgroundColor: "rgba(59, 130, 246, 0.08)", color: "#fff" }}>
                  Ak potrebuješ ísť hlbšie, zvýš limit kandidátov alebo časový limit. Pre menej zásahov môžeš vypnúť brute-force a
                  spoliehať sa len na slovníky.
                </Alert>
              )}

              <TableContainer component={Paper} variant="outlined" sx={{ ...baseCardSx, p: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: "#cbd5f5" }}>Login</TableCell>
                      <TableCell sx={{ color: "#cbd5f5" }}>Soľ</TableCell>
                      <TableCell sx={{ color: "#cbd5f5" }}>Heslo</TableCell>
                      <TableCell sx={{ color: "#cbd5f5" }}>Kategória</TableCell>
                      <TableCell sx={{ color: "#cbd5f5" }}>Pokusy</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.cracked.map((row) => (
                      <TableRow key={`${row.login}-${row.salt}`}>
                        <TableCell sx={{ color: "#e2e8f0" }}>{row.login}</TableCell>
                        <TableCell sx={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                          {row.salt}
                          <Button
                            onClick={() => copy(row.salt)}
                            size="small"
                            sx={{ minWidth: 0, ml: 1, color: "rgba(255,255,255,0.8)" }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </Button>
                        </TableCell>
                        <TableCell sx={{ color: "#e2e8f0", fontFamily: "monospace" }}>
                          {row.password}
                          <Button
                            onClick={() => copy(row.password)}
                            size="small"
                            sx={{ minWidth: 0, ml: 1, color: "rgba(255,255,255,0.8)" }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </Button>
                        </TableCell>
                        <TableCell sx={{ color: "#cbd5f5" }}>{row.category}</TableCell>
                        <TableCell sx={{ color: "#cbd5f5" }}>{row.attempts.toLocaleString("sk-SK")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {result.remaining.length > 0 && (
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                  Nezlomené účty: {result.remaining.length}. Skús pridať ďalšie mená alebo zvýšiť brute-force limity.
                </Typography>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </PageShell>
  );
}
