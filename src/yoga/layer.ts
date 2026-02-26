import { Layer as BaseLayer, FullLayer as BaseFullLayer } from "../lib/layer";
import { withYoga } from "./base";

export const Layer = withYoga(BaseLayer);

export const FullLayer = withYoga(BaseFullLayer);
