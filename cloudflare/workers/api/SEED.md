# Import conturi

Seed-ul cu identități și parole hardcodate a fost eliminat. Folosește importul
controlat descris în `DEPLOY.md`; acesta este idempotent pentru conturile existente,
acceptă maximum 100 de utilizatori per lot și obligă fiecare cont nou să schimbe
parola temporară la primul login.
