# Contexte projet — à donner à Claude en début de session

## Projets
- **Backend** : `/home/kelkaid/Bureau/voit/v2/voit-api` (NestJS, DDD/CQRS)
- **Frontend** : `/home/kelkaid/Bureau/voit/v1/voit-admin` (React, shadcn/ui, TanStack Query, react-hook-form, Zod)

---

## Architecture backend — patterns à respecter

### Référence : module `user` et `wallet`

**Pour chaque feature, les fichiers suivants existent :**

```
src/modules/<feature>/
  domain/
    <feature>.entity.ts        → AggregateRoot, méthodes domaine, getters calculés
    <feature>.types.ts         → interfaces des props
    <feature>.errors.ts        → erreurs domaine (extend ExceptionBase, code: 'FEATURE.ERROR_NAME')
  database/
    <feature>.repository.port.ts  → interface du repo + FindXxxParams (filtres)
    <feature>.repository.ts       → implémentation Prisma
    <feature>.mapper.ts           → toPersistence / toDomain / toResponse
  commands/<action>/
    <action>.command.ts           → extend Command, props typés
    <action>.service.ts           → @CommandHandler, ICommandHandler, retourne Result<T, Errors>
    <action>.http.controller.ts   → @Controller, match() pour convertir Err → HttpException
    <action>.request.dto.ts       → class-validator decorators
  queries/<action>/
    <action>.query-handler.ts     → extend PaginatedQueryBase, Prisma direct (pas repo)
    <action>.http.controller.ts   → unwrap() direct (queries ne retournent pas d'erreurs métier)
    <action>.request.dto.ts
  <feature>.module.ts
  <feature>.di-tokens.ts
```

### Pattern service (command)
```typescript
@CommandHandler(XxxCommand)
export class XxxService implements ICommandHandler {
  constructor(@Inject(FEATURE_REPOSITORY) private readonly repo: FeatureRepositoryPort) {}

  async execute(command: XxxCommand): Promise<Result<AggregateID, ErrorA | ErrorB>> {
    const found = await this.repo.findOneById(command.id);
    if (found.isNone()) return Err(new NotFoundError());

    const entity = found.unwrap();
    if (!entity.isOwnedBy(command.requesterId)) return Err(new AccessDeniedError());

    // Checks domaine directs (pas try/catch) :
    if (command.amount > entity.remaining) return Err(new ExceedsAmountError());

    entity.doSomething({ ... });
    await this.repo.save(entity);
    return Ok(entity.id);
  }
}
```

### Pattern controller (command)
```typescript
return match(result, {
  Ok: (id: string) => new IdResponse(id),
  Err: (error) => {
    if (error instanceof NotFoundError) throw new NotFoundException(error.message);
    if (error instanceof AccessDeniedError) throw new ForbiddenException(error.message);
    if (error instanceof ExceedsAmountError) throw new UnprocessableEntityException(error.message);
    throw error;
  },
});
```

### Pattern erreur domaine
```typescript
export class DebtRepaymentExceedsAmountError extends ExceptionBase {
  static readonly message = 'Repayment amount exceeds remaining debt';
  readonly code = 'DEBT.REPAYMENT_EXCEEDS_AMOUNT';
  constructor(cause?: Error) { super(DebtRepaymentExceedsAmountError.message, cause); }
}
```

### Pattern query (find avec filtres)
- Filtres dans `FindXxxRequestDto` ET dans `FindXxxParams` (repository.port.ts) ET dans `FindXxxQuery`
- **IMPORTANT** : les filtres du DTO sont lus via `@Body()` sur GET (pattern template), mais Axios ne supporte pas les bodies sur GET → solution : lire aussi depuis `@Query()` avec un TODO
- Exemple dans `find-users.http.controller.ts` :
```typescript
@Query() queryParams: PaginatedQueryRequestDto & { name?: string }
// name: request.name ?? queryParams?.name  // TODO: À voir comment gérer ce filtre
```

### Gestion des erreurs HTTP
- `ExceptionInterceptor` global (interceptor, pas filter) : ajoute correlationId, transforme erreurs class-validator
- Le `code` domaine (`DEBT.REPAYMENT_EXCEEDS_AMOUNT`) n'est PAS automatiquement exposé dans la réponse HTTP
- Réponse actuelle : `{ statusCode, message, error, correlationId }`
- Pour exposer le code : `throw new UnprocessableEntityException({ message: error.message, code: error.code })` (non implémenté, décision prise de garder message libre côté front pour l'instant)

---

## Architecture frontend — patterns à respecter

### Référence : feature `dettes` (la seule avec vraie API)

**Structure d'une feature :**
```
src/features/<feature>/
  api/<feature>-api.ts     → fonctions async + hooks React Query (useQuery/useMutation)
  components/
    <feature>-*.tsx        → composants UI
  data/
    schema.ts              → types Zod
    data.ts                → constantes UI
  index.tsx                → page principale
```

### Pattern API (React Query)
```typescript
// dettes-api.ts — RÉFÉRENCE
const DEBTS_KEY = ['debts'] as const

async function fetchDebts(): Promise<Dette[]> {
  const data = await apiClient.get('/v1/debts')
  return z.array(detteSchema).parse(data)
}

export function useGetDettes() {
  return useQuery({ queryKey: DEBTS_KEY, queryFn: fetchDebts })
}

export function useCreateDette() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDette,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEBTS_KEY }),
  })
}
```

### apiClient
- Fichier : `src/lib/api-client.ts`
- Axios avec : base URL depuis `VITE_API_URL`, token Firebase auto, retourne `response.data` directement
- **IMPORTANT** : Axios supprime le body sur GET → toujours utiliser `{ params: { ... } }` pour les filtres GET

### UI : EXCLUSIVEMENT shadcn/ui
- Composants disponibles : `Button`, `Input`, `Textarea`, `Card`, `CardContent`, `CardTitle`, `CardDescription`, `ScrollArea`, `Label`, `Separator`, `Form*`, `Sheet*`, `Command*`, `Popover*`, `Badge`, `Select`, `Dialog*`, `Tooltip`, `Switch`, etc.
- Tailwind pour le styling
- **Zéro HTML brut** (`<div>`, `<p>`, `<button>` etc.) sauf `<form>` (inévitable pour react-hook-form) et `<span>` dans les labels

### Gestion des erreurs côté front
```typescript
mutate(payload, {
  onSuccess: () => toast.success('...'),
  onError: (error: any) => toast.error(error?.response?.data?.message ?? 'Une erreur est survenue.'),
})
```

---

## Ce qui a été fait dans cette session

### Backend (`voit-api`)

**Module `debt` — add-repayment :**
- `debt.errors.ts` → ajout `DebtRepaymentExceedsAmountError` (code: `DEBT.REPAYMENT_EXCEEDS_AMOUNT`)
- `debt.entity.ts` → ajout getter `remaining: number`
- `add-repayment.service.ts` → check `command.amount > debt.remaining` avant `addRepayment()`
- `add-repayment.http.controller.ts` → mapping `UnprocessableEntityException` pour la nouvelle erreur

**Module `user` — find-users :**
- `user.repository.port.ts` → ajout `name?: string` dans `FindUsersParams`
- `find-users.request.dto.ts` → ajout `name?: string` avec `@IsOptional() @IsString() @MaxLength(100)`
- `find-users.query-handler.ts` → ajout `name?: string` dans `FindUsersQuery` + filtre Prisma `OR firstName/lastName CONTAINS`
- `find-users.http.controller.ts` → lecture `name` depuis `@Query()` en fallback (TODO laissé)

### Frontend (`voit-admin`)

**Feature `users` :**
- `src/features/users/api/users-api.ts` → créé : hook `useSearchUsers(name)` avec debounce 300ms
- `src/features/users/components/user-combobox.tsx` → créé : combobox recherche server-side

**Feature `dettes` :**
- `dettes-mutate-drawer.tsx` → redesign complet avec sélection de rôle (J'ai prêté / J'ai emprunté), nouveau design shadcn
- `dettes-remboursements-drawer.tsx` → ajout `onError` avec toast

---

## Ce qui reste à faire

### Priorité haute
- **`dettes-mutate-drawer.tsx`** : le body de la requête POST n'est pas encore adapté pour le rôle "J'ai emprunté". Actuellement `borrowerId = personId` toujours. Si rôle = `borrowed`, l'utilisateur courant est l'emprunteur et la personne sélectionnée est le prêteur → il faut que le backend accepte un `lenderId` dans le payload de création de dette.

### À décider
- Exposer le `code` domaine dans les réponses d'erreur HTTP (actuellement non fait, message libre utilisé côté front)
- Résoudre proprement le TODO sur `find-users` : filtres GET via body ou query param ?
