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
  triedLower: number;
  triedMixed: number;
  durationMs: number;
  timedOut: boolean;
  limitHitLower: boolean;
  limitHitMixed: boolean;
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
  const [useDefaultNames, setUseDefaultNames] = React.useState<boolean>(true);
  const [deriveFromLogin, setDeriveFromLogin] = React.useState<boolean>(true);
  const [enableLower, setEnableLower] = React.useState<boolean>(true);
  const [enableMixed, setEnableMixed] = React.useState<boolean>(true);
  const [maxLower, setMaxLower] = React.useState<number>(300000);
  const [maxMixed, setMaxMixed] = React.useState<number>(200000);
  const [timeLimit, setTimeLimit] = React.useState<number>(30000);
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
          includeDefaultNames: useDefaultNames,
          deriveFromLogins: deriveFromLogin,
          enableLowerBruteforce: enableLower,
          enableMixedBruteforce: enableMixed,
          maxLowerCandidates: maxLower,
          maxMixedCandidates: maxMixed,
          timeLimitMs: timeLimit,
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
  ] : [];

  const limiterHint = result && (result.stats.limitHitLower || result.stats.limitHitMixed || result.stats.timedOut);

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

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={useDefaultNames}
                    onChange={(_, v) => setUseDefaultNames(v)}
                    color="primary"
                  />
                }
                label="Pridať vstavaný kalendár mien (s jedným veľkým písmenom kdekoľvek)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={deriveFromLogin}
                    onChange={(_, v) => setDeriveFromLogin(v)}
                    color="primary"
                  />
                }
                label="Použiť login a login bez číslic ako kandidát"
              />
            </Stack>

            <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.24)" }} />

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={enableLower}
                    onChange={(_, v) => setEnableLower(v)}
                    color="primary"
                  />
                }
                label="Brute-force 6-7 písmen (a-z)"
              />
              <TextField
                type="number"
                label="Max. kandidátov"
                value={maxLower}
                onChange={(e) => setMaxLower(Number(e.target.value))}
                sx={{ width: 180, ...textFieldSx }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">≤</InputAdornment>,
                }}
                disabled={!enableLower}
              />
            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={enableMixed}
                    onChange={(_, v) => setEnableMixed(v)}
                    color="primary"
                  />
                }
                label="Brute-force 4-5 znakov (a-zA-Z0-9)"
              />
              <TextField
                type="number"
                label="Max. kandidátov"
                value={maxMixed}
                onChange={(e) => setMaxMixed(Number(e.target.value))}
                sx={{ width: 180, ...textFieldSx }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">≤</InputAdornment>,
                }}
                disabled={!enableMixed}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <TextField
                type="number"
                label="Celkový limit času (ms)"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                sx={{ width: 200, ...textFieldSx }}
              />
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.74)" }}>
                Výpočet prebieha v jednom vlákne Node.js; vysoké limity môžu zamrznúť UI.
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
                {result.stats.limitHitLower && (
                  <Chip label="Stop: limit a-z" color="warning" sx={{ color: "#0f172a" }} />
                )}
                {result.stats.limitHitMixed && (
                  <Chip label="Stop: limit a-zA-Z0-9" color="warning" sx={{ color: "#0f172a" }} />
                )}
              </Stack>

              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                Slovník: {result.stats.triedNames + result.stats.triedCustom + result.stats.triedLogin} kandidátov,&nbsp;
                a-z (6/7): {result.stats.triedLower.toLocaleString("sk-SK")},&nbsp;
                alfanum (4/5): {result.stats.triedMixed.toLocaleString("sk-SK")}.
              </Typography>

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
