import { useAddress } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { useEffect, useMemo, useState } from "react";
import BigNumber from "bignumber.js";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_EVENT_MANAGER!;
const provierRpc = process.env.NEXT_PUBLIC_PROVIDER_RPC!;
import contract from "../contracts/EventManager.json";
import { EVENT_BLACK_LIST } from "src/constants/event";
import axios from "axios";

export interface IEventGroup {
  groupId: BigNumber;
  name: string;
}
export interface IEventRecord {
  eventRecordId: BigNumber;
  groupId: BigNumber;
  name: string;
  description: string;
  date: string;
  useMtx: boolean;
}
export interface INFTImage {
  name: string;
  image: string;
  description: string;
  requiredParticipateCount: number;
  fileObject?: File | null;
}
export interface INFTAttribute {
  name: string;
  image: string;
  description: string;
  external_link: string;
  traits: { [key: string]: any };
}

export interface ICreateEventGroupParams {
  groupName: string;
  nftAttributes: INFTImage[];
}

export interface ICreateEventRecordParams {
  groupId: string;
  eventName: string;
  description: string;
  date: Date;
  startTime: string; // "18:00"
  endTime: string; // "21:00"
  secretPhrase: string;
  mintLimit: number;
  useMtx: boolean;
  attributes: { metaDataURL: string; requiredParticipateCount: number }[];
}

export interface IApplyForParticipation {
  eventId: number;
}

/**
 * A bridgge to the event manager contract
 */
export const getEventManagerContract = (config = { signin: false }) => {
  if (!config.signin) {
    const provider = new ethers.providers.JsonRpcProvider(provierRpc);
    const _contract = new ethers.Contract(
      contractAddress,
      contract.abi,
      provider
    );
    return _contract;
  } else {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum as any);

      const signer = provider.getSigner();
      const _contract = new ethers.Contract(
        contractAddress,
        contract.abi,
        signer
      );
      return _contract;
    }
  }
};

/**
 * custom hook function for creating an event group
 * @returns
 */
export const useCreateEventGroup = () => {
  const [errors, setErrors] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);
  const [nftAttributes, setNftAttributes] = useState<INFTImage[]>([]);
  const address = useAddress();

  useEffect(() => {
    const eventManager = getEventManagerContract();
    if (!eventManager) throw "error: contract can't found";
    const filters = eventManager?.filters.CreatedGroupId(address, null);
    eventManager.on(filters, (_, _groupId: BigNumber) => {
      setCreatedGroupId(_groupId.toNumber());
    });

    return () => {
      eventManager.removeAllListeners("CreatedGroupId");
    };
  }, []);

  useEffect(() => {
    if (status && createdGroupId !== null) {
      window.localStorage.setItem(
        `group${createdGroupId}`,
        JSON.stringify(nftAttributes)
      );
      setLoading(false);
    }
  }, [status, createdGroupId]);

  const createEventGroup = async (params: ICreateEventGroupParams) => {
    try {
      setNftAttributes(params.nftAttributes);
      setCreatedGroupId(null);
      setLoading(true);
      setErrors(null);
      const eventManager = getEventManagerContract({ signin: true });
      if (!eventManager) throw "error: contract can't found";
      const tx = await eventManager.createGroup(params.groupName);
      await tx.wait();
      setStatus(true);
    } catch (e: any) {
      setErrors(e.error?.data || "error occured");
      setLoading(false);
    }
  };

  return { status, errors, loading, createEventGroup, createdGroupId };
};
/**
 * custom hook function for getting all event groups
 *
 * @returns
 */
export const useEventGroups = () => {
  const [groups, setGroups] = useState<IEventGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getEventGroups = async () => {
      const eventManager = getEventManagerContract();
      if (!eventManager) throw "error";
      setLoading(true);
      const data = await eventManager.getGroups();
      setGroups(data);
      setLoading(false);
    };
    getEventGroups();
  }, []);

  return { groups, loading };
};

/**
 * custom hook function for get login user's groups
 */
export const useOwnEventGroups = () => {
  const [groups, setGroups] = useState<IEventGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const address = useAddress();

  useEffect(() => {
    const getOwnEventGroups = async () => {
      if (!address) return;
      const eventManager = getEventManagerContract({ signin: true });
      if (!eventManager) throw "error: contract can't found";
      setLoading(true);
      const data = await eventManager.getOwnGroups();
      setLoading(false);
      setGroups(data);
    };
    getOwnEventGroups();
  }, [address]);

  return { groups, loading };
};

/**
 * custom hook function for creating an event record
 * @returns
 */
export const useCreateEventRecord = () => {
  const [errors, setErrors] = useState<Error | null>(null);
  const [generatingVk, setGeneratingVk] = useState(false);
  const [makingTx, setMakingTx] = useState(false);
  const [status, setStatus] = useState(false);

  const loading = useMemo(() => {
    return generatingVk || makingTx;
  }, [generatingVk, makingTx]);

  const createEventRecord = async (params: ICreateEventRecordParams) => {
    setErrors(null);
    try {
      setGeneratingVk(true);
      const { data } = await axios.get("/api/zk/generate-verification-keys");
      console.log(data);
      setGeneratingVk(false);
      const { ethereum } = window;
      const eventManager = getEventManagerContract({ signin: true });
      if (!eventManager) throw "error: contract can't found";
      setMakingTx(true);
      const datestr = params.date.toLocaleDateString();
      const provider = new ethers.providers.Web3Provider(ethereum as any);
      let value!: ethers.BigNumber;
      if (params.useMtx) {
        const gasPrice = (await provider.getGasPrice())?.toNumber();
        value = ethers.utils.parseEther(
          `${gasPrice * params.mintLimit * 250000 * 2.1 * 0.000000000000000001}`
        );
      }
      const tx = await eventManager.createEventRecord(
        Number(params.groupId),
        params.eventName,
        params.description,
        `${datestr} ${params.startTime}~${params.endTime}`,
        params.mintLimit,
        params.useMtx,
        data.vk,
        params.attributes,
        {
          value: params.useMtx ? value : 0,
        }
      );
      await tx.wait();
      setMakingTx(false);
      setStatus(true);
    } catch (e: any) {
      console.log(e);
      setErrors(e.error?.data || "error occured");
      setGeneratingVk(false);
      setMakingTx(false);
    }
  };
  return { status, errors, loading, generatingVk, makingTx, createEventRecord };
};

/**
 * custom hook function for getting all event records
 *
 * @returns
 */
export const useEventRecords = () => {
  const [errors, setErrors] = useState<Error | null>(null);
  const [records, setRecords] = useState<IEventRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErrors(null);
    const getEventRecords = async () => {
      try {
        const eventManager = getEventManagerContract();
        if (!eventManager) throw "error";
        setLoading(true);
        const data: IEventRecord[] = await eventManager.getEventRecords();
        setLoading(false);
        setRecords(
          data.filter(
            (e) => !EVENT_BLACK_LIST.includes(e.eventRecordId.toNumber())
          )
        );
      } catch (e: any) {
        setErrors(e.error?.data || "error occured");
        setLoading(false);
      }
    };
    getEventRecords();
  }, []);

  return { records, errors, loading };
};

/**
 * custom hook function for getting an event record by id
 *
 * @returns
 */
export const useGetEventById = (eventId: number) => {
  const [event, setEvent] = useState<IEventRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getEventById = async () => {
      if (!eventId) return;
      const eventManager = getEventManagerContract();
      if (!eventManager) throw "error";
      setLoading(true);
      const data = await eventManager.getEventById(eventId);
      setLoading(false);
      setEvent(data);
    };

    getEventById();
  }, [eventId]);

  return { event, loading };
};

/**
 * custom hook function for getting the event records that the sender has applied for participation
 *
 * @returns
 */
export const useGetParticipationEventIds = () => {
  const [eventIds, setEventIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const getParticipationEventIds = async () => {
    console.log("get event records that you have applied for participation");
    const eventManager = getEventManagerContract({ signin: true });
    if (!eventManager) throw "error";
    setLoading(true);
    const data = await eventManager.getParticipationEventIds();
    setLoading(false);
    const _data = data.map((d: any) => d.toNumber());
    setEventIds(_data);
    return _data;
  };
  return { eventIds, loading, getParticipationEventIds };
};

/**
 * custom hook function for applying for participation
 * @returns
 */
export const useApplyForParticipation = () => {
  const [errors, setErrors] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(false);
  const applyForParticipation = async (params: IApplyForParticipation) => {
    setErrors(null);
    try {
      const eventManager = getEventManagerContract({ signin: true });
      if (!eventManager) throw "error: contract can't found";
      setLoading(true);
      const tx = await eventManager.applyForParticipation(params.eventId);
      await tx.wait();
      setLoading(false);
      setStatus(true);
    } catch (e: any) {
      setErrors(e.error?.data || "error occured");
      setLoading(false);
    }
  };
  return { status, errors, loading, applyForParticipation };
};
