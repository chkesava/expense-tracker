import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Modal from "../../../components/common/Modal";
import FormField from "../../../components/ui/FormField";
import Button from "../../../components/ui/Button";
import { usePortfolioSettings } from "../hooks/usePortfolioSettings";
import { fieldClass } from "../utils/styles";

const editCashSchema = z.object({
  cashBalance: z.number().min(0, "Cash balance cannot be negative"),
});

type EditCashInput = z.infer<typeof editCashSchema>;

interface EditCashBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditCashBalanceModal({ isOpen, onClose }: EditCashBalanceModalProps) {
  const { settings, updateCashBalance } = usePortfolioSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditCashInput>({
    resolver: zodResolver(editCashSchema),
    defaultValues: {
      cashBalance: settings?.cashBalance ?? 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ cashBalance: settings?.cashBalance ?? 0 });
    }
  }, [isOpen, settings?.cashBalance, reset]);

  const onSubmit = handleSubmit(async (data) => {
    await updateCashBalance(data.cashBalance);
    onClose();
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Cash Balance">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField id="cash-balance" label="Cash Balance (₹)" error={errors.cashBalance?.message}>
          <input
            id="cash-balance"
            type="number"
            step="0.01"
            {...register("cashBalance", { valueAsNumber: true })}
            className={fieldClass}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Cash Balance"}
        </Button>
      </form>
    </Modal>
  );
}
