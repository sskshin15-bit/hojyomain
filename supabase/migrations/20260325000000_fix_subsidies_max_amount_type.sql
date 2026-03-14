-- max_amount が integer だと 21 億円超の補助金でオーバーフローするため numeric に変更
ALTER TABLE public.subsidies
  ALTER COLUMN max_amount TYPE numeric USING max_amount::numeric;
