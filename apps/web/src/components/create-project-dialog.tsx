"use client";

import { Button, Dialog, Flex, TextField } from "@radix-ui/themes";

export function CreateProjectDialog({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="3">+ Neues Projekt</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Neues Projekt</Dialog.Title>
        <form action={action}>
          <TextField.Root name="name" placeholder="Projektname" required autoFocus />
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Abbrechen
              </Button>
            </Dialog.Close>
            <Button type="submit">Erstellen</Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
