"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { rc4DecryptWithPassword, scoreReadable } from "@/lib/crypto/rc4";
import PageShell from "../components/page-shell";

// === Typy pre uložené šifrované súbory a výsledky dešifrovania ===

type EncFile = {
  name: string;
  data: Uint8Array;
  md5?: string;
};

type DecResult = {
  key: string;
  bytes: Uint8Array;
  score: number;
};

// === Pomocné funkcie pre Blob/ArrayBuffer/HEX/text ===

function toArrayBufferSlice(u8: Uint8Array): ArrayBuffer {
  const slice = u8.buffer.slice(
    u8.byteOffset,
    u8.byteOffset + u8.byteLength,
  );
  return slice as ArrayBuffer;
}

function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime = "application/octet-stream",
) {
  const buf = toArrayBufferSlice(bytes);
  const blob = new Blob([buf], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * bytesToUtf8Safe:
 * - pokúsi sa dekódovať bajty ako UTF-8 text,
 * - spočíta podiel "printable" znakov,
 * - ak je aspoň 75 %, vráti string,
 * - inak vráti null (text sa zobrazí v HEX dump formáte).
 */
function bytesToUtf8Safe(bytes: Uint8Array): string | null {
  try {
    const txt = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const printable = [...txt].filter(
      (ch) =>
        ch === "\n" ||
        ch === "\r" ||
        ch === "\t" ||
        (ch >= " " && ch <= "~"),
    ).length;
    const ratio = printable / Math.max(1, txt.length);
    return ratio >= 0.75 ? txt : null;
  } catch {
    return null;
  }
}

/**
 * bytesToHexDump:
 * - klasický HEX dump (offset, hex bajty, ASCII podoba),
 * - používa sa pre binárne výstupy alebo nečitateľný text.
 */
function bytesToHexDump(bytes: Uint8Array, width = 16): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const toAsc = (n: number) =>
    n >= 32 && n <= 126 ? String.fromCharCode(n) : ".";
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += width) {
    const row = bytes.slice(i, i + width);
    const hex = Array.from(row)
      .map(toHex)
      .join(" ");
    const asc = Array.from(row)
      .map(toAsc)
      .join("");
    out.push(
      `${i.toString().padStart(8, "0")}  ${hex.padEnd(width * 3 - 1, " ")}  |${asc}|`,
    );
  }
  return out.join("\n");
}

// === Štýlové objekty pre karty / textField / tlačidlá ===

const baseCardSx = {
  borderRadius: 4,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 24px 48px -32px rgba(15, 23, 42, 0.85)",
  color: "#ffffff",
};

const cardSx = {
  ...baseCardSx,
  p: { xs: 3, md: 3.5 },
};

const compactCardSx = {
  ...baseCardSx,
  p: 2,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  boxShadow: "0 18px 32px -28px rgba(15, 23, 42, 0.85)",
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

// MD5 odtlačky podľa zadania – slúžia na vizuálnu kontrolu
const STREAM_ASSIGNMENT_FILES = [
  { name: "text1_enc.txt", md5: "4622c7bcb17d81c081baec766fb6fdc2" },
  { name: "text2_enc.txt", md5: "95048f6ded12b35a87015078c236abf2" },
  { name: "text3_enc.txt", md5: "be5401874206c8066a255ad39f127ca2" },
  { name: "text4_enc.txt", md5: "8314a669612496867c3388c76e783bf7" },
];

// vstupné obmedzenia pre interval kľúčov (6 číslic)
const rangeInputProps = {
  inputMode: "numeric",
  pattern: "\\d{6}",
  min: 100000,
  max: 999999,
  step: 1,
};

/**
 * clampSixDigit:
 * - z textu sa pokúsi urobiť číslo a ohraničí ho na [100000,999999],
 * - používa sa pre valídny vstup "Od" a "Do".
 */
function clampSixDigit(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100000;
  return Math.min(999999, Math.max(100000, Math.floor(parsed)));
}

const outlineButtonSx = {
  borderColor: "rgba(148, 163, 184, 0.35)",
  color: "#ffffff",
  "&:hover": {
    borderColor: "rgba(129, 140, 248, 0.7)",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
};

const chipSx = {
  color: "#ffffff",
  borderColor: "rgba(148, 163, 184, 0.4)",
  backgroundColor: "rgba(15, 23, 42, 0.35)",
  "& .MuiChip-icon": {
    color: "#ffffff",
  },
};

const successChipSx = {
  ...chipSx,
  borderColor: "rgba(34, 197, 94, 0.6)",
  backgroundColor: "rgba(34, 197, 94, 0.35)",
};

export default function Zadanie3Page() {
  // === Stav aplikácie pre RC4 úlohu ===
  const [files, setFiles] = React.useState<EncFile[]>([]);
  const [decResults, setDecResults] = React.useState<(DecResult | null)[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // interval brute-force kľúčov
  const [rangeFrom, setRangeFrom] = React.useState("100000");
  const [rangeTo, setRangeTo] = React.useState("101000");

  // stav progresu brute-force (počet skúsených kľúčov, nájdený kľúč, ktorý súbor)
  const [progress, setProgress] = React.useState<{
    tried: number;
    found?: string;
    target?: string;
  }>({ tried: 0 });

  // ktorý súbor používame ako "target" pri brute-force
  const [selectedFileIndex, setSelectedFileIndex] = React.useState(0);

  // ref slúži na zastavenie brute-force loopu
  const stopRef = React.useRef(false);

  // stav pre dialóg "Zadaj 6-ciferný kľúč"
  const [dlgOpen, setDlgOpen] = React.useState(false);
  const [dlgIndex, setDlgIndex] = React.useState<number | null>(null);
  const [dlgKey, setDlgKey] = React.useState("");
  const dlgFile = dlgIndex !== null ? files[dlgIndex] : null;

  //----------------------Nahratie súborov------------------------
  /**
   * onChoose:
   * - načíta nahraté súbory (binárne) do Uint8Array,
   * - resetuje výsledky dešifrovania,
   * - nastaví prvý súbor ako vybraný pre brute-force.
   */
  const onChoose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files;
    if (!fl) return;
    const arr: EncFile[] = [];
    for (const f of Array.from(fl)) {
      const buf = new Uint8Array(await f.arrayBuffer());
      arr.push({ name: f.name, data: buf });
    }
    setFiles(arr);
    setDecResults(arr.map(() => null));
    setSelectedFileIndex(0);
    setError(null);
  };

  /**
   * hashOne:
   * - pre vybraný súbor spočíta MD5 hash cez API /api/hash,
   * - uloží MD5 do stavu,
   * - otvorí dialóg na zadanie konkrétneho 6-ciferného kľúča.
   */
  const hashOne = async (idx: number) => {
    setError(null);
    const f = files[idx];
    const form = new FormData();
    form.append(
      "file",
      new Blob([toArrayBufferSlice(f.data)], {
        type: "application/octet-stream",
      }),
      f.name,
    );
    const res = await fetch("/api/hash", { method: "POST", body: form });
    const j = await res.json();
    const md5 = j.md5 as string | undefined;
    const next = [...files];
    next[idx] = { ...f, md5 };
    setFiles(next);

    setDlgIndex(idx);
    setDlgKey("");
    setDlgOpen(true);
  };

  //----------------------Ručné zadanie heslo------------------------
  /**
   * tryKeyFor:
   * - ručné vyskúšanie konkrétneho 6-ciferného kľúča pre jeden súbor,
   * - použije rc4DecryptWithPassword + scoreReadable,
   * - uloží výsledok do decResults[idx].
   */
  const tryKeyFor = (idx: number, key: string) => {
    try {
      const f = files[idx];
      const bytes = rc4DecryptWithPassword(f.data, key);
      const score = scoreReadable(bytes);
      setDecResults((prev) => {
        const copy = [...prev];
        copy[idx] = { key, bytes, score };
        return copy;
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Nepodarilo sa desifrovat s tymto heslom.");
    }
  };

  const copyText = async (txt: string) => {
    await navigator.clipboard.writeText(txt);
  };

  /**
   * onBrute:
   * - spustí brute-force hľadanie 6-ciferného kľúča v danom intervale,
   * - testuje kľúče na jednom "target" súbore (selectedFileIndex),
   * - používa scoreReadable na odhad "čitateľnosti" plaintextu,
   * - keď nájde dostatočne dobrý kľúč, aplikuje ho na všetky súbory.
   */

  //----------------------Brute-force hľadanie hesla------------------------

  const onBrute = async () => {
    setError(null);
    if (!files.length) {
      setError("Najprv nahraj sifrovane subory.");
      return;
    }
    if (selectedFileIndex < 0 || selectedFileIndex >= files.length) {
      setError("Vyber subor pre brute-force hladanie.");
      return;
    }
    
    const from = clampSixDigit(rangeFrom);
    const to = clampSixDigit(rangeTo);

    if (from > to) {
      setError("Neplatny interval klucov.");
      return;
    }

    setBusy(true);
    stopRef.current = false;
    const filesSnapshot = files;
    const target = filesSnapshot[selectedFileIndex];
    setProgress({ tried: 0, found: undefined, target: target.name });

    // Počet kľúčov, ktoré sa otestujú v jednej "várke" (loop) – aby UI nezamrzlo
    const BATCH = 2000;

    // Prah "úspechu" – keď score dosiahne aspoň toto, berieme kľúč ako nájdený
    const successThreshold = Math.max(50, target.data.length * 0.4);

    let bestScore = Number.NEGATIVE_INFINITY;
    let bestKey: string | null = null;

    /**
     * applyKeyToAll:
     * - vezme nájdený kľúč a dešifruje ním všetky nahraté súbory,
     * - uloží ich výsledky do decResults (pre zobrazenie UI).
     */
    const applyKeyToAll = (key: string) => {
      const next = filesSnapshot.map((f) => {
        const dec = rc4DecryptWithPassword(f.data, key);
        return {
          key,
          bytes: dec,
          score: scoreReadable(dec),
        } as DecResult;
      });
      setDecResults(next);
    };

    /**
     * updateBest:
     * - priebežne si pamätá najlepší kľúč podľa score,
     * - využije sa, ak v intervale nič nepresiahne successThreshold.
     */
    const updateBest = (key: string, score: number) => {
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    };

    /**
     * finalize:
     * - skončí brute-force, vypne "busy",
     * - ak máme dobrý kľúč (hit alebo best), dešifruje ním všetky súbory.
     */
    const finalize = (finalKey?: string | null) => {
      setBusy(false);
      const keyToApply = finalKey ?? bestKey;
      if (keyToApply) {
        applyKeyToAll(keyToApply);
        if (finalKey) {
          setProgress((prev) => ({
            ...prev,
            found: finalKey,
            target: target.name,
          }));
        }
      }
    };

    //------------------Skušanie kľúčov v zadanom intervale-----------------
    /**
     * testKey:
     * - vyskúša konkrétnu číselnú hodnotu ako heslo:
     *   1) prevedie ju na 6-ciferný string (001234 → "001234"),
     *   2) dešifruje target súbor,
     *   3) spočíta scoreReadable,
     *   4) aktualizuje bestScore/bestKey,
     *   5) ak score >= successThreshold, vráti nájdený kľúč.
     */
    const testKey = (value: number): string | null => {
      const key = value.toString().padStart(6, "0");
      try {
        const bytes = rc4DecryptWithPassword(target.data, key);
        const score = scoreReadable(bytes);
        updateBest(key, score);
        if (score >= successThreshold) {
          return key;
        }
      } catch {
        // ignoruj nesprávne heslo (aj tak pokračujeme ďalej)
      }
      return null;
    };

    let current = from;
    const limit = to;

    /**
     * loop:
     * - hlavný brute-force cyklus,
     * - v každom volaní skúsi až BATCH kľúčov,
     * - priebežne aktualizuje progress (počet skúsených),
     * - po spracovaní dávky sa cez setTimeout(0) naplánuje ďalšie volanie,
     *   aby UI ostalo responzívne,
     * - po nájdení hitKey alebo po vyčerpaní intervalu zavolá finalize().
     */
    const loop = () => {
      if (stopRef.current) {
        return;
      }
      if (current > limit) {
        stopRef.current = true;
        setProgress((prev) => ({
          ...prev,
          tried: limit - from + 1,
          target: target.name,
        }));
        finalize(null);
        return;
      }
      let hitKey: string | null = null;
      for (let i = 0; i < BATCH && current <= limit; i++) {
        const value = current;
        current += 1;
        const found = testKey(value);
        if (found) {
          hitKey = found;
          break;
        }
      }
      setProgress((prev) => ({
        tried: Math.min(current - from, limit - from + 1),
        found: hitKey ?? prev.found,
        target: target.name,
      }));

      if (!hitKey) {
        // naplánuj ďalšiu várku, aby sa neblokoval hlavný thread
        setTimeout(loop, 0);
      } else {
        // našli sme dobrý kľúč → ukonči brute-force
        stopRef.current = true;
        finalize(hitKey);
      }
    };

    loop();
  };

  /**
   * stopBrute:
   * - nastaví stopRef.current na true,
   * - tým sa hlavný loop prestane ďalej plánovať,
   * - vypne "busy" stav (tlačidlá v UI).
   */
  const stopBrute = () => {
    stopRef.current = true;
    setBusy(false);
  };

  return (
    <>
      <PageShell
        title="Zadanie 3 - Prudova sifra (RC4)"
        subtitle="Nahraj sifrovane subory, over MD5 odtlacky, skus kluc rucne alebo spusti brute-force hladanie s hodnotenim citatelnosti."
        maxWidth="xl"
      >
        <Stack spacing={{ xs: 3.5, md: 4 }}>
          {/* === Horný panel: nahratie súborov + info o zadaní === */}
          <Paper variant="outlined" sx={cardSx}>
            <Stack spacing={3}>
              <Typography>
                Nahraj binarne alebo textove subory. Podla potreby over hash,
                zadaj kluc a uloz dekriptovane vystupy.
              </Typography>
              <Button component="label" variant="contained">
                Vybrat subory
                <input type="file" multiple hidden onChange={onChoose} />
              </Button>

              {/* Info blok so zadanim a MD5 odtlačkami */}
              <Paper
                variant="outlined"
                sx={{ ...compactCardSx, mt: 0, p: 2.5 }}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Zadanie a dostupne subory
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#ffffff" }}>
                    Ziskajte text1_enc.txt az text4_enc.txt (MD5 uvedene nize)
                    zo zadania spusteneho cez stream.c. Subory sa maju stahovat
                    binarne (priamy download, nie kopirovanie textu).
                  </Typography>
                  <Stack spacing={0.5}>
                    {STREAM_ASSIGNMENT_FILES.map((file) => (
                      <Stack
                        key={file.name}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace", color: "#ffffff" }}
                        >
                          {file.name}
                        </Typography>
                        <Chip
                          label={`MD5: ${file.md5}`}
                          size="small"
                          sx={{ ...chipSx, height: 24 }}
                        />
                      </Stack>
                    ))}
                  </Stack>
                  <Typography variant="body2" sx={{ color: "#ffffff" }}>
                    Hesla su 6-ciferny retazec [100000, 999999]. Funkcia
                    getKey v stream.c doplna heslo o znak '\0' medzi kopie a
                    pomocna kniznica v <code>lib/crypto/rc4.ts</code> vytvara ten isty
                    kľúč pre RC4 generátor.
                  </Typography>
                </Stack>
              </Paper>

              {/* Tabuľka s nahratými súbormi + MD5 + stiahnutie dešifrovaných verzií */}
              {files.length > 0 && (
                <Paper variant="outlined" sx={compactCardSx}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    Subory
                  </Typography>
                  <Table
                    size="small"
                    sx={{
                      "& .MuiTableCell-root": {
                        color: "#ffffff",
                        borderColor: "rgba(148, 163, 184, 0.25)",
                      },
                    }}
                  >
                    <TableBody>
                      {files.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell
                            width="40%"
                            sx={{
                              borderColor: "rgba(148, 163, 184, 0.25)",
                              color: "#ffffff",
                            }}
                          >
                            {f.name}
                          </TableCell>
                          <TableCell
                            width="30%"
                            sx={{
                              borderColor: "rgba(148, 163, 184, 0.25)",
                            }}
                          >
                            {f.md5 ? (
                              <Chip
                                icon={<CheckIcon />}
                                label={`MD5: ${f.md5}`}
                                size="small"
                                sx={successChipSx}
                              />
                            ) : (
                              <Button
                                onClick={() => hashOne(i)}
                                size="small"
                                variant="outlined"
                                sx={outlineButtonSx}
                              >
                                MD5 a zadat kluc
                              </Button>
                            )}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              borderColor: "rgba(148, 163, 184, 0.25)",
                            }}
                          >
                            {decResults[i] && (
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                              >
                                <Chip
                                  size="small"
                                  label={`kluc: ${decResults[i]!.key}`}
                                  sx={chipSx}
                                />
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DownloadIcon />}
                                  sx={outlineButtonSx}
                                  onClick={() =>
                                    downloadBytes(
                                      decResults[i]!.bytes,
                                      f.name.replace(
                                        "_enc",
                                        `_dec_${decResults[i]!.key}`,
                                      ),
                                    )
                                  }
                                >
                                  Stiahnut
                                </Button>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </Stack>
          </Paper>

          {/* === Panel pre brute-force hľadanie kľúča === */}
          {files.length > 0 && (
            <Paper variant="outlined" sx={cardSx}>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Brute-force 6-cifernych klucov
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.76)" }}>
                    Hlada kluce v danom intervale a hodnoti plaintext pomerom
                    citatelnych znakov. Najlepsie vysledky automaticky ulozi.
                  </Typography>
                </Stack>

                {/* formulár pre interval kľúčov a výber súboru */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4} md={3}>
                    <TextField
                      label="Od"
                      value={rangeFrom}
                      type="number"
                      onChange={(e) => setRangeFrom(e.target.value)}
                      onBlur={() =>
                        setRangeFrom(String(clampSixDigit(rangeFrom)))
                      }
                      fullWidth
                      sx={textFieldSx}
                      inputProps={rangeInputProps}
                      helperText="Rozsah: 100000–999999"
                      FormHelperTextProps={{
                        sx: { color: "#ffffff" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4} md={3}>
                    <TextField
                      label="Do"
                      value={rangeTo}
                      type="number"
                      onChange={(e) => setRangeTo(e.target.value)}
                      onBlur={() =>
                        setRangeTo(String(clampSixDigit(rangeTo)))
                      }
                      fullWidth
                      sx={textFieldSx}
                      inputProps={rangeInputProps}
                      helperText="Rozsah: 100000–999999"
                      FormHelperTextProps={{
                        sx: { color: "#ffffff" },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4} md={3}>
                    <TextField
                      select
                      label="Subor"
                      value={selectedFileIndex}
                      onChange={(e) =>
                        setSelectedFileIndex(Number(e.target.value))
                      }
                      fullWidth
                      sx={textFieldSx}
                      SelectProps={{
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              color: "#ffffff",
                            },
                          },
                        },
                      }}
                    >
                      {files.map((file, idx) => (
                        <MenuItem
                          key={file.name}
                          value={idx}
                          sx={{ color: "#ffffff" }}
                        >
                          {file.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    sm={12}
                    md={3}
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      justifyContent: { xs: "flex-start", md: "flex-end" },
                    }}
                  >
                    <Button
                      variant="contained"
                      onClick={onBrute}
                      disabled={busy}
                      startIcon={<PlayArrowIcon />}
                    >
                      Spustit brute-force
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={stopBrute}
                      disabled={!busy}
                      startIcon={<StopIcon />}
                      sx={outlineButtonSx}
                    >
                      Zastavit
                    </Button>
                  </Grid>
                </Grid>

                {/* indikátory progresu brute-force */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`Subor: ${
                      files[selectedFileIndex]?.name ?? progress.target ?? "?"
                    }`}
                    sx={chipSx}
                  />
                  <Chip
                    label={`Skusene kluce: ${progress.tried}`}
                    sx={chipSx}
                  />
                  {progress.found && (
                    <Chip
                      label={`Najdeny kluc: ${progress.found}`}
                      sx={successChipSx}
                    />
                  )}
                  {busy && (
                    <CircularProgress size={20} sx={{ ml: 1 }} />
                  )}
                </Stack>
              </Stack>
            </Paper>
          )}

          {/* Globálne chybové hlásenie */}
          {error && (
            <Alert
              severity="error"
              variant="filled"
              sx={{
                borderRadius: 3,
                backgroundColor: "rgba(248, 113, 113, 0.85)",
                color: "#ffffff",
              }}
            >
              {error}
            </Alert>
          )}

          {/* Zobrazenie výsledkov dešifrovania pre každý súbor */}
          <Stack spacing={3.5}>
            {files.map((f, i) => {
              const res = decResults[i];
              if (!res) return null;
              const text = bytesToUtf8Safe(res.bytes);
              return (
                <Paper key={`view-${i}`} variant="outlined" sx={cardSx}>
                  <Stack spacing={2.5}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Vysledok - {f.name} (kluc {res.key}, skore {res.score})
                    </Typography>
                    {text ? (
                      <>
                        <Typography variant="subtitle2">
                          Zobrazenie ako text (UTF-8):
                        </Typography>
                        <TextField
                          value={text}
                          multiline
                          minRows={8}
                          fullWidth
                          sx={textFieldSx}
                          InputProps={{ readOnly: true }}
                        />
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            variant="outlined"
                            startIcon={<ContentCopyIcon />}
                            onClick={() => copyText(text)}
                            sx={outlineButtonSx}
                          >
                            Kopirovat text
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() =>
                              downloadBytes(
                                res.bytes,
                                f.name.replace("_enc", `_dec_${res.key}.txt`),
                                "text/plain",
                              )
                            }
                            sx={outlineButtonSx}
                          >
                            Stiahnut TXT
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography variant="subtitle2">
                          Binarne zobrazenie (hex dump):
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            whiteSpace: "pre",
                            p: 2,
                            borderRadius: 3,
                            backgroundColor: "rgba(15, 23, 42, 0.45)",
                            border: "1px solid rgba(148, 163, 184, 0.28)",
                            overflowX: "auto",
                            color: "#ffffff",
                          }}
                        >
                          {bytesToHexDump(res.bytes)}
                        </Box>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={() =>
                              downloadBytes(
                                res.bytes,
                                f.name.replace("_enc", `_dec_${res.key}.bin`),
                              )
                            }
                            sx={outlineButtonSx}
                          >
                            Stiahnut BIN
                          </Button>
                        </Stack>
                      </>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      </PageShell>

      {/* Dialóg na ručné zadanie 6-ciferného kľúča pre konkrétny súbor */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            color: "#ffffff",
          },
        }}
      >
        <DialogTitle sx={{ color: "#ffffff" }}>Zadaj 6-ciferny kluc</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "#ffffff" }}>
              Subor: <b>{dlgFile?.name}</b>
            </Typography>
            {dlgFile?.md5 && (
              <Chip
                label={`MD5: ${dlgFile.md5}`}
                sx={{ ...successChipSx, alignSelf: "flex-start" }}
              />
            )}
            <TextField
              label="Heslo (100000-999999)"
              value={dlgKey}
              onChange={(e) => setDlgKey(e.target.value.trim())}
              inputProps={{ maxLength: 6, inputMode: "numeric", pattern: "\\d{6}" }}
              fullWidth
              sx={textFieldSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: "1px solid rgba(148, 163, 184, 0.25)",
            color: "#ffffff",
          }}
        >
          <Button onClick={() => setDlgOpen(false)} sx={{ color: "#ffffff" }}>
            Zavriet
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (dlgIndex !== null && /^\d{6}$/.test(dlgKey)) {
                tryKeyFor(dlgIndex, dlgKey);
                setDlgOpen(false);
              }
            }}
          >
            Desifrovat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
