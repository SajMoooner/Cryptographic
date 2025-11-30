"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
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
import PageShell from "../components/page-shell";

// Predefinované úlohy
const TASKS = [
  { n: "2164267772327", e: "65537", y: "1325266873785" },
  { n: "16812615098258879", e: "65537", y: "1990249581724467" },
  { n: "181052234309092978339", e: "65537", y: "147885702766350471578" },
  { n: "1327612780145399205245813", e: "65537", y: "1075593273482743198269527" },
  { n: "329897251897125970254396723194243", e: "65537", y: "22712629296843271867140518185260" },
  { n: "26845416039893360305516015851501077574841", e: "65537", y: "6820997247850432766042868007364587250604" },
  { n: "2146776870009792253322117406137065611833216495831", e: "65537", y: "604615692674313046352476676786807225671015935385" },
];

type RSAResult = {
  ok: boolean;
  n: string;
  e: string;
  y: string;
  p?: string;
  q?: string;
  phi?: string;
  d?: string;
  m?: string;
  timeMs: number;
  error?: string;
  method?: string;
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

export default function Zadanie4Page() {
  const [customN, setCustomN] = React.useState("");
  const [customE, setCustomE] = React.useState("65537");
  const [customY, setCustomY] = React.useState("");
  const [customResult, setCustomResult] = React.useState<RSAResult | null>(null);
  const [customLoading, setCustomLoading] = React.useState(false);
  const [results, setResults] = React.useState<Map<number, RSAResult>>(new Map());
  const [loading, setLoading] = React.useState<Set<number>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [abortControllers, setAbortControllers] = React.useState<Map<number | 'custom', AbortController>>(new Map());

  const solveRSA = async (n: string, e: string, y: string, taskIndex?: number) => {
    setError(null);

    const key = taskIndex !== undefined ? taskIndex : 'custom';
    const abortController = new AbortController();

    // Uložiť abort controller
    setAbortControllers(prev => new Map(prev).set(key, abortController));

    if (taskIndex !== undefined) {
      setLoading(prev => new Set(prev).add(taskIndex));
    } else {
      setCustomLoading(true);
      setCustomResult(null);
    }

    try {
      const res = await fetch("/api/rsa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ n, e, y, timeLimitMs: 300000 }),
        signal: abortController.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        if (taskIndex !== undefined) {
          setResults(prev => new Map(prev).set(taskIndex, {
            ok: false,
            n,
            e,
            y,
            timeMs: data.timeMs || 0,
            error: data.error,
            method: data.method
          }));
        } else {
          setCustomResult({
            ok: false,
            n,
            e,
            y,
            timeMs: data.timeMs || 0,
            error: data.error || "Nepodarilo sa vyriešiť RSA úlohu.",
            method: data.method
          });
        }
      } else {
        if (taskIndex !== undefined) {
          setResults(prev => new Map(prev).set(taskIndex, data));
        } else {
          setCustomResult(data);
        }
      }
    } catch (e: any) {
      // Ak bola operácia zrušená, nezobrazuj error
      if (e.name === 'AbortError') {
        const abortedMsg = "Výpočet bol zastavený.";
        if (taskIndex !== undefined) {
          setResults(prev => new Map(prev).set(taskIndex, {
            ok: false,
            n,
            e,
            y,
            timeMs: 0,
            error: abortedMsg
          }));
        } else {
          setCustomResult({
            ok: false,
            n,
            e,
            y,
            timeMs: 0,
            error: abortedMsg
          });
        }
      } else {
        const errMsg = e?.message || "Nepodarilo sa vyriešiť RSA úlohu.";
        if (taskIndex !== undefined) {
          setResults(prev => new Map(prev).set(taskIndex, {
            ok: false,
            n,
            e,
            y,
            timeMs: 0,
            error: errMsg
          }));
        } else {
          setCustomResult({
            ok: false,
            n,
            e,
            y,
            timeMs: 0,
            error: errMsg
          });
        }
      }
    } finally {
      // Odstrániť abort controller
      setAbortControllers(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });

      if (taskIndex !== undefined) {
        setLoading(prev => {
          const next = new Set(prev);
          next.delete(taskIndex);
          return next;
        });
      } else {
        setCustomLoading(false);
      }
    }
  };

  const stopCalculation = (taskIndex?: number) => {
    const key = taskIndex !== undefined ? taskIndex : 'custom';
    const controller = abortControllers.get(key);
    if (controller) {
      controller.abort();
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text ?? "");
  };

  const solveAll = async () => {
    for (let i = 0; i < TASKS.length; i++) {
      const task = TASKS[i];
      await solveRSA(task.n, task.e, task.y, i);
    }
  };

  return (
    <PageShell
      title="Zadanie 4 - RSA Dešifrovanie"
      subtitle="Rýchle dešifrovanie: menšie moduly manuálnou trial division + Pollard Rho, veľké cez bigint-crypto-utils a vylepšený Pollard Rho."
      maxWidth="xl"
    >
      <Stack spacing={{ xs: 3.5, md: 4 }}>
        {/* Custom input section */}
        <Paper variant="outlined" sx={cardSx}>
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Vlastná úloha
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="n (modul)"
                value={customN}
                onChange={(e) => setCustomN(e.target.value)}
                fullWidth
                sx={textFieldSx}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="e (verejný exponent)"
                  value={customE}
                  onChange={(e) => setCustomE(e.target.value)}
                  sx={{ flex: 1, ...textFieldSx }}
                />
                <TextField
                  label="y (šifrovaná správa)"
                  value={customY}
                  onChange={(e) => setCustomY(e.target.value)}
                  sx={{ flex: 1, ...textFieldSx }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <Button
                  onClick={() => solveRSA(customN, customE, customY)}
                  variant="contained"
                  disabled={!customN || !customY || customLoading}
                  sx={{ flex: 1 }}
                >
                  {customLoading ? (
                    <>
                      <CircularProgress size={18} sx={{ mr: 1 }} />
                      Počítam...
                    </>
                  ) : (
                    "Vyriešiť vlastnú úlohu"
                  )}
                </Button>
                {customLoading && (
                  <Button
                    onClick={() => stopCalculation()}
                    variant="outlined"
                    color="error"
                    sx={{
                      borderColor: "rgba(239, 68, 68, 0.5)",
                      color: "#ef4444",
                      "&:hover": {
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                      }
                    }}
                  >
                    STOP
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {/* Custom result */}
        {customResult && (
          <Paper variant="outlined" sx={cardSx}>
            <Stack spacing={2.5}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Výsledok vlastnej úlohy
              </Typography>

              {customResult.error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {customResult.error}
                </Alert>
              ) : (
                <Stack spacing={2}>
                  <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        n (modul):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {customResult.n}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        y (ciphertext):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {customResult.y}
                      </Box>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        p (prvočíslo 1):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                          color: "#4ade80",
                        }}
                      >
                        {customResult.p}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        q (prvočíslo 2):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                          color: "#4ade80",
                        }}
                      >
                        {customResult.q}
                      </Box>
                    </Box>
                  </Stack>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        φ(n):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {customResult.phi}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        d (privátny kľúč):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                          color: "#f59e0b",
                        }}
                      >
                        {customResult.d}
                      </Box>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      m (dešifrovaná správa):
                    </Typography>
                    <Box
                      sx={{
                        fontFamily: "var(--font-geist-mono)",
                        fontSize: "1.2rem",
                        wordBreak: "break-all",
                        color: "#60a5fa",
                        fontWeight: 600,
                      }}
                    >
                      {customResult.m}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                      Čas výpočtu: {customResult.timeMs}ms
                      {customResult.method && ` • Metóda: ${customResult.method === 'library' ? 'Knižničná (bigint-crypto-utils + Pollard Rho/Brent)' : 'Rýchla manuálna (trial division + Pollard Rho)'}`}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copy(customResult.d || "")}
                      sx={outlineButtonSx}
                    >
                      Kopírovať d
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copy(customResult.m || "")}
                      sx={outlineButtonSx}
                    >
                      Kopírovať m
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        )}

        {error && (
          <Alert
            severity="error"
            variant="filled"
            sx={{ borderRadius: 3, backgroundColor: "rgba(248, 113, 113, 0.85)" }}
          >
            {error}
          </Alert>
        )}

        {/* Predefined tasks */}
        <Paper variant="outlined" sx={cardSx}>
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Predefinované úlohy
              </Typography>
              <Button
                onClick={solveAll}
                variant="outlined"
                sx={outlineButtonSx}
              >
                Vyriešiť všetky
              </Button>
            </Stack>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: "#fff", fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: 600 }}>n</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: 600 }}>e</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: 600 }}>y</TableCell>
                    <TableCell sx={{ color: "#fff", fontWeight: 600 }}>Akcie</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {TASKS.map((task, idx) => {
                    const result = results.get(idx);
                    const isLoading = loading.has(idx);

                    return (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: "#fff" }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>{idx + 1}</span>
                            {task.n.length >= 25 && (
                              <Chip
                                label="Library"
                                size="small"
                                sx={{
                                  fontSize: "0.7rem",
                                  height: "20px",
                                  backgroundColor: "rgba(139, 92, 246, 0.2)",
                                  color: "#c084fc",
                                  borderColor: "rgba(192, 132, 252, 0.3)",
                                  fontWeight: 600,
                                }}
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: "#fff", fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {task.n.length > 20 ? `${task.n.slice(0, 20)}...` : task.n}
                        </TableCell>
                        <TableCell sx={{ color: "#fff" }}>{task.e}</TableCell>
                        <TableCell sx={{ color: "#fff", fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {task.y.length > 20 ? `${task.y.slice(0, 20)}...` : task.y}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              onClick={() => solveRSA(task.n, task.e, task.y, idx)}
                              variant="outlined"
                              size="small"
                              disabled={isLoading}
                              sx={outlineButtonSx}
                            >
                              {isLoading ? (
                                <>
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                  Počítam...
                                </>
                              ) : result ? (
                                result.ok ? "Prepočítať" : "Skúsiť znova"
                              ) : (
                                "Vyriešiť"
                              )}
                            </Button>
                            {isLoading && (
                              <Button
                                onClick={() => stopCalculation(idx)}
                                variant="outlined"
                                size="small"
                                color="error"
                                sx={{
                                  minWidth: "auto",
                                  px: 1.5,
                                  borderColor: "rgba(239, 68, 68, 0.5)",
                                  color: "#ef4444",
                                  "&:hover": {
                                    borderColor: "#ef4444",
                                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                                  }
                                }}
                              >
                                STOP
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>

        {/* Results */}
        {Array.from(results.entries()).map(([idx, result]) => (
          <Paper key={idx} variant="outlined" sx={cardSx}>
            <Stack spacing={2.5}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Výsledok úlohy #{idx + 1}
              </Typography>

              {result.error ? (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {result.error}
                </Alert>
              ) : (
                <Stack spacing={2}>
                  <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        n (modul):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {result.n}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        y (ciphertext):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {result.y}
                      </Box>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        p (prvočíslo 1):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                          color: "#4ade80",
                        }}
                      >
                        {result.p}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        q (prvočíslo 2):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                          color: "#4ade80",
                        }}
                      >
                        {result.q}
                      </Box>
                    </Box>
                  </Stack>

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        φ(n):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {result.phi}
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        d (privátny kľúč):
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: "var(--font-geist-mono)",
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                          color: "#f59e0b",
                        }}
                      >
                        {result.d}
                      </Box>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(148, 163, 184, 0.3)" }} />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      m (dešifrovaná správa):
                    </Typography>
                    <Box
                      sx={{
                        fontFamily: "var(--font-geist-mono)",
                        fontSize: "1.2rem",
                        wordBreak: "break-all",
                        color: "#60a5fa",
                        fontWeight: 600,
                      }}
                    >
                      {result.m}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                      Čas výpočtu: {result.timeMs}ms
                      {result.method && ` • Metóda: ${result.method === 'library' ? 'Knižničná (bigint-crypto-utils + Pollard Rho/Brent)' : 'Rýchla manuálna (trial division + Pollard Rho)'}`}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copy(result.d || "")}
                      sx={outlineButtonSx}
                    >
                      Kopírovať d
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copy(result.m || "")}
                      sx={outlineButtonSx}
                    >
                      Kopírovať m
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </PageShell>
  );
}
