# AVYRON OS — RBAC și tenant isolation

Autorizarea este server-side. Rolurile din JWT ajută la autentificare rapidă,
dar operațiile privilegiate recitesc D1, astfel încât suspendarea sau revocarea
să nu depindă de codul frontend.

## Nivel platformă

| Rol | Domeniu | Drepturi |
| --- | --- | --- |
| `platform_owner` | toate organizațiile | control platformă, AI OS, provisioning |
| `superadmin` | toate organizațiile | operații privilegiate, fără drept owner-only |
| `admin` legacy | fără principal activ | nu este automat superadmin |

Principalul este identificat în `platform_principals`. O schimbare ulterioară
trebuie să scrie și un `security_events`, cu motiv și actor.

## Nivel organizație

| Rol | Citește tenantul | Modifică proiecte | Administrează membri |
| --- | --- | --- | --- |
| `owner` | da | da | da |
| `admin` | da | da | da |
| `manager` | da | da | nu |
| `specialist` | da | proiecte asignate/context organizație | nu |
| `client_admin` | da | nu direct; propuneri controlate | nu |
| `client_member` | da | nu | nu |
| `viewer` | da | nu | nu |

Rolurile globale `user`, `staff`, `admin` rămân temporar pentru compatibilitate.
Pe o resursă cu `organization_id`, membershipul sau asignarea explicită are
prioritate; un simplu rol `staff` nu oferă acces cross-tenant.

## Matrice de operații sensibile

| Operație | Guard server-side | Audit |
| --- | --- | --- |
| creare organizație | principal platformă activ | `organization.create` |
| invitare membru | platformă sau owner/admin organizație | `organization.invite` |
| acceptare invitație | token hash valid + același email autentificat | `organization.invitation.accept` |
| citire proiect tenant | membership/asignare/platformă | project log la mutații |
| configurare AI | `platform_owner` | versiune nouă + run history |
| acțiune AI external/financial/publish | approval explicit neexpirat | approval + run step |
| revocare sesiune | proprietarul sesiunii | motiv de revocare în session |
| acces staff/platformă | rol curent din D1 + sesiune MFA | login + `security_events` |
| schimbare email | parolă + sesiune MFA pentru cont privilegiat + token email | sesiuni revocate + security event |

## MFA și sesiuni privilegiate

Conturile platformă, rolurile globale `staff`/`admin` și membershipurile
operaționale `owner`/`admin`/`manager`/`specialist` intră în fluxul MFA. Un
cont fără factor activ poate autentifica doar o sesiune neprivilegiată pentru
enrollment; mutațiile privilegiate răspund cu `mfa_required`. După activare,
loginul creează mai întâi un challenge de cinci minute și emite sesiunea numai
după TOTP sau un recovery code valid.

Secretul TOTP este criptat AES-GCM cu `MFA_ENCRYPTION_KEY`; recovery codes și
challenge tokens sunt stocate exclusiv ca hash. Dezactivarea MFA cere parola,
un TOTP valid și revocă toate sesiunile.

## Reguli obligatorii pentru endpointuri noi

1. extrage tenantul din resursa server-side, nu dintr-un rol trimis de client;
2. validează membershipul activ și statusul organizației;
3. folosește allowlist pentru câmpuri și valori;
4. nu include secrete sau date sensibile în loguri;
5. pentru POST-uri retriabile, folosește idempotency/outbox;
6. testează explicit acces cross-tenant și revocarea.
